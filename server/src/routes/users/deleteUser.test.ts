import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";

// ---------------------------------------------------------------------------
// Stable mock references — must be declared before mock.module calls
// ---------------------------------------------------------------------------

const mockFindFirst = mock(async () => null);
const mockCount = mock(async () => 2);
const mockUpdate = mock(async () => ({}));
const mockUpdateMany = mock(async () => ({ count: 0 }));
const mockTransaction = mock((ops: Promise<unknown>[]) => Promise.all(ops));

mock.module("../../lib/prisma", () => ({
  default: {
    user: { findFirst: mockFindFirst, count: mockCount, update: mockUpdate },
    ticket: { updateMany: mockUpdateMany },
    $transaction: mockTransaction,
  },
}));

const { deleteUser } = await import("./deleteUser");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: { params?: Record<string, string>; session?: unknown } = {}) {
  return {
    params: { id: "target-id" },
    session: { user: { id: "requester-id" } },
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const res: Record<string, ReturnType<typeof mock>> = {};
  res.status = mock(() => res);
  res.json = mock(() => res);
  res.end = mock(() => res);
  return res as unknown as Response;
}

const AGENT_USER = { id: "target-id", role: "agent", deletedAt: null };
const ADMIN_USER = { id: "target-id", role: "admin", deletedAt: null };

beforeEach(() => {
  mockFindFirst.mockReset();
  mockCount.mockReset();
  mockUpdate.mockReset();
  mockUpdateMany.mockReset();
  mockTransaction.mockReset();

  mockUpdate.mockResolvedValue({});
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deleteUser", () => {
  it("returns 400 when trying to delete own account", async () => {
    const req = makeReq({ params: { id: "requester-id" } });
    const res = makeRes();

    await deleteUser(req, res, () => {});

    expect((res as any).status).toHaveBeenCalledWith(400);
    expect((res as any).json).toHaveBeenCalledWith({ error: "Cannot delete your own account" });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when user is not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();

    await deleteUser(req, res, () => {});

    expect((res as any).status).toHaveBeenCalledWith(404);
    expect((res as any).json).toHaveBeenCalledWith({ error: "User not found" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 when deleting the last admin", async () => {
    mockFindFirst.mockResolvedValue(ADMIN_USER);
    mockCount.mockResolvedValue(1);
    const req = makeReq();
    const res = makeRes();

    await deleteUser(req, res, () => {});

    expect((res as any).status).toHaveBeenCalledWith(400);
    expect((res as any).json).toHaveBeenCalledWith({ error: "Cannot delete the last admin" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("unassigns tickets and soft-deletes user atomically on success", async () => {
    mockFindFirst.mockResolvedValue(AGENT_USER);
    const req = makeReq();
    const res = makeRes();

    await deleteUser(req, res, () => {});

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { assignedToId: "target-id" },
      data: { assignedToId: null },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "target-id" },
      data: { deletedAt: expect.any(Date) },
    });
    expect((res as any).status).toHaveBeenCalledWith(204);
    expect((res as any).end).toHaveBeenCalled();
  });

  it("allows deleting a non-last admin", async () => {
    mockFindFirst.mockResolvedValue(ADMIN_USER);
    mockCount.mockResolvedValue(2);
    const req = makeReq();
    const res = makeRes();

    await deleteUser(req, res, () => {});

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect((res as any).status).toHaveBeenCalledWith(204);
  });
});
