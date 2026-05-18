import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TicketsPage } from "./TicketsPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet, patch: mockPatch })),
    isAxiosError: (e: unknown) => (e as any).__isAxiosError === true,
  },
}));

vi.mock("../lib/auth-client", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../components/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar" />,
}));

import { useSession } from "../lib/auth-client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER = { id: "admin-1", name: "Admin", role: "admin" };
const AGENT_USER = { id: "agent-1", name: "Alice", role: "agent" };
const AGENT_ALICE = { id: "agent-1", name: "Alice" };
const AGENT_BOB = { id: "agent-2", name: "Bob" };

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: "ticket-1",
    subject: "Cannot log in",
    status: "open",
    clientEmail: "customer@example.com",
    assignedTo: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    _count: { messages: 3 },
    ...overrides,
  };
}

function pageResponse(tickets: unknown[], overrides: Record<string, unknown> = {}) {
  return { data: { tickets, total: tickets.length, page: 1, pageSize: 10, ...overrides } };
}

function axiosErr(message: string) {
  return Object.assign(new Error(message), {
    __isAxiosError: true,
    response: { data: { error: message } },
  });
}

function lastGetUrl() {
  const calls = mockGet.mock.calls;
  return calls[calls.length - 1]?.[0] as string;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: { user: ADMIN_USER } });
  mockGet.mockImplementation((url: string) => {
    if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE, AGENT_BOB] });
    return Promise.resolve(pageResponse([]));
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe("TicketsPage — layout", () => {
  it("renders the Tickets heading", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Tickets" })).toBeInTheDocument();
  });

  it("shows all column headers", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Assigned to")).toBeInTheDocument();
    expect(screen.getByText("Last updated")).toBeInTheDocument();
  });

  it("shows empty state when there are no tickets", async () => {
    renderPage();
    expect(await screen.findByText("No tickets yet.")).toBeInTheDocument();
  });

  it("shows API error", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.reject(axiosErr("Internal server error"));
    });
    renderPage();
    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Ticket list rendering
// ---------------------------------------------------------------------------

describe("TicketsPage — ticket rows", () => {
  it("renders ticket subject, email and status", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse([makeTicket()]));
    });
    renderPage();
    expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("shows message count", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse([makeTicket({ _count: { messages: 5 } })]));
    });
    renderPage();
    expect(await screen.findByText("5")).toBeInTheDocument();
  });

  it("subject is a link to the ticket detail page", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse([makeTicket({ id: "ticket-99" })]));
    });
    renderPage();
    const link = await screen.findByRole("link", { name: "Cannot log in" });
    expect(link).toHaveAttribute("href", "/tickets/ticket-99");
  });

  it("shows ticket count in header", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse(
        [makeTicket(), makeTicket({ id: "t2", subject: "Another" })],
        { total: 2 }
      ));
    });
    renderPage();
    expect(await screen.findByText("1–2 of 2")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AssignCell — admin role
// ---------------------------------------------------------------------------

describe("TicketsPage — assign cell (admin)", () => {
  it("shows a dropdown for an unassigned ticket", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: null })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    // Filter bar: category (0), assignedTo (1). Row: status (2), category (3), assign (4)
    const assignSelect = screen.getAllByRole("combobox")[4];
    expect(assignSelect).toBeInTheDocument();
    // "Unassigned" appears in filter bar + row assign dropdown
    expect(screen.getAllByRole("option", { name: "Unassigned" }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows a dropdown with current assignee selected", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE, AGENT_BOB] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: AGENT_ALICE })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    const assignSelect = screen.getAllByRole("combobox")[4];
    expect(assignSelect).toHaveValue(AGENT_ALICE.id);
  });

  it("calls PATCH assign when admin changes dropdown", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: AGENT_ALICE } });
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: null })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    const assignSelect = screen.getAllByRole("combobox")[4];
    await userEvent.selectOptions(assignSelect, AGENT_ALICE.id);
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1/assign", { userId: AGENT_ALICE.id });
  });

  it("calls PATCH with null when admin selects Unassigned", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: null } });
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: AGENT_ALICE })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    const assignSelect = screen.getAllByRole("combobox")[4];
    await userEvent.selectOptions(assignSelect, "");
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1/assign", { userId: null });
  });
});

// ---------------------------------------------------------------------------
// AssignCell — agent role
// ---------------------------------------------------------------------------

describe("TicketsPage — assign cell (agent)", () => {
  beforeEach(() => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: { user: AGENT_USER } });
  });

  it("shows 'Assign to me' when ticket is unassigned", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: null })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    expect(screen.getByRole("button", { name: "Assign to me" })).toBeInTheDocument();
  });

  it("clicking 'Assign to me' calls PATCH with the agent's own id", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: AGENT_USER } });
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: null })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    await userEvent.click(screen.getByRole("button", { name: "Assign to me" }));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1/assign", { userId: AGENT_USER.id });
  });

  it("shows 'You' with a lock when the ticket is assigned to the current agent", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: AGENT_USER })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    expect(screen.getByText("You")).toBeInTheDocument();
    // Filter bar (2) + row status + row category = 4; no assign combobox for agent
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
  });

  it("shows the other agent's name (read-only) when assigned to someone else", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_BOB] });
      return Promise.resolve(pageResponse([makeTicket({ assignedTo: AGENT_BOB })]));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    // Bob appears in both the filter bar's assignedTo dropdown and the ticket row
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
    // Filter bar (2) + row status + row category = 4; no assign combobox for agent
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering — status pills
// ---------------------------------------------------------------------------

describe("TicketsPage — status filter", () => {
  it("renders all status filter buttons", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Closed" })).toBeInTheDocument();
  });

  it("clicking a status pill refetches with that status", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(lastGetUrl()).toContain("status=open");
  });

  it("shows 'Clear filters' when a status is selected", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(await screen.findByText("Clear filters")).toBeInTheDocument();
  });

  it("Clear filters resets to all tickets", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    await userEvent.click(await screen.findByText("Clear filters"));
    expect(lastGetUrl()).not.toContain("status=");
  });

  it("shows filtered empty state when filters are active and no results", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    expect(await screen.findByText("No tickets match your filters.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering — search
// ---------------------------------------------------------------------------

describe("TicketsPage — search", () => {
  it("renders the search input", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    expect(screen.getByPlaceholderText("Search subject or email…")).toBeInTheDocument();
  });

  it("typing in search refetches with search param", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Tickets" });
    fireEvent.change(screen.getByPlaceholderText("Search subject or email…"), {
      target: { value: "billing" },
    });
    await waitFor(() => {
      const urls = mockGet.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("search=billing"))).toBe(true);
    }, { timeout: 2000 });
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("TicketsPage — pagination", () => {
  it("does not show pagination when total fits in one page", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse([makeTicket()], { total: 1, pageSize: 10 }));
    });
    renderPage();
    await screen.findByText("Cannot log in");
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("shows pagination when there are multiple pages", async () => {
    const tickets = Array.from({ length: 10 }, (_, i) =>
      makeTicket({ id: `t${i}`, subject: `Ticket ${i}` })
    );
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve(pageResponse(tickets, { total: 25, pageSize: 10 }));
    });
    renderPage();
    await screen.findByText("Ticket 0");
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("clicking next page refetches with page=2", async () => {
    const tickets = Array.from({ length: 10 }, (_, i) =>
      makeTicket({ id: `t${i}`, subject: `Ticket ${i}` })
    );
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      if ((url as string).includes("page=2")) return Promise.resolve(pageResponse([], { total: 25, page: 2, pageSize: 10 }));
      return Promise.resolve(pageResponse(tickets, { total: 25, pageSize: 10 }));
    });
    renderPage();
    await screen.findByText("Ticket 0");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      const urls = mockGet.mock.calls.map((c) => c[0] as string);
      expect(urls.some((u) => u.includes("page=2"))).toBe(true);
    });
  });
});
