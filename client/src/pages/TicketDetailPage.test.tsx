import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "./TicketDetailPage";

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
    subject: "Login issue",
    status: "open",
    category: "general",
    clientEmail: "customer@example.com",
    assignedTo: null,
    gmailThreadId: "thread-1",
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-01-02T10:00:00.000Z",
    messages: [
      {
        id: "msg-1",
        body: "I can't log in",
        sender: "customer@example.com",
        direction: "inbound",
        createdAt: "2024-01-01T10:00:00.000Z",
      },
      {
        id: "msg-2",
        body: "We're looking into this",
        sender: "support@helpdesk.com",
        direction: "outbound",
        createdAt: "2024-01-01T11:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function axiosErr(message: string) {
  return Object.assign(new Error(message), {
    __isAxiosError: true,
    response: { data: { error: message } },
  });
}

function renderPage(ticketId = "ticket-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets" element={<div>Tickets list</div>} />
        </Routes>
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
    return Promise.resolve({ data: makeTicket() });
  });
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe("TicketDetailPage — layout", () => {
  it("renders the ticket subject as heading", async () => {
    renderPage();
    expect(await screen.findByText("Login issue")).toBeInTheDocument();
  });

  it("shows the client email in the meta", async () => {
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getAllByText("customer@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the message count", async () => {
    renderPage();
    expect(await screen.findByText("2 messages")).toBeInTheDocument();
  });

  it("shows an API error when the ticket fetch fails", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.reject(axiosErr("Ticket not found"));
    });
    renderPage();
    expect(await screen.findByText("Ticket not found")).toBeInTheDocument();
  });

  it("back button navigates to /tickets", async () => {
    renderPage();
    await screen.findByText("Login issue");
    await userEvent.click(screen.getByRole("button", { name: /all tickets/i }));
    expect(await screen.findByText("Tickets list")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Messages thread
// ---------------------------------------------------------------------------

describe("TicketDetailPage — messages", () => {
  it("renders inbound message body", async () => {
    renderPage();
    expect(await screen.findByText("I can't log in")).toBeInTheDocument();
  });

  it("renders outbound message body", async () => {
    renderPage();
    expect(await screen.findByText("We're looking into this")).toBeInTheDocument();
  });

  it("renders both message senders", async () => {
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getAllByText("customer@example.com").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("support@helpdesk.com")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Status select
// ---------------------------------------------------------------------------

describe("TicketDetailPage — status select", () => {
  it("shows the status label", async () => {
    renderPage();
    expect(await screen.findByText("Status")).toBeInTheDocument();
  });

  it("renders status select with current value", async () => {
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[0];
    expect(statusSelect).toHaveValue("open");
  });

  it("calls PATCH /tickets/:id with the new status", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", status: "closed" } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "closed");
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1", { status: "closed" });
  });

  it("updates the status select after successful mutation", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", status: "pending" } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "pending");
    await waitFor(() => expect(selects[0]).toHaveValue("pending"));
  });
});

// ---------------------------------------------------------------------------
// Category select
// ---------------------------------------------------------------------------

describe("TicketDetailPage — category select", () => {
  it("shows the category label", async () => {
    renderPage();
    expect(await screen.findByText("Category")).toBeInTheDocument();
  });

  it("renders category select with current value", async () => {
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    const categorySelect = selects[1];
    expect(categorySelect).toHaveValue("general");
  });

  it("calls PATCH /tickets/:id with the new category", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", category: "billing" } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "billing");
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1", { category: "billing" });
  });

  it("updates the category select after successful mutation", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", category: "technical" } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "technical");
    await waitFor(() => expect(selects[1]).toHaveValue("technical"));
  });

  it("renders a ticket with non-default category correctly", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [] });
      return Promise.resolve({ data: makeTicket({ category: "billing" }) });
    });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    expect(selects[1]).toHaveValue("billing");
  });
});

// ---------------------------------------------------------------------------
// Assignee — display
// ---------------------------------------------------------------------------

describe("TicketDetailPage — assignee display", () => {
  it("shows 'Assigned to' label", async () => {
    renderPage();
    expect(await screen.findByText("Assigned to")).toBeInTheDocument();
  });

  it("shows 'Unassigned' option selected when ticket has no assignee", async () => {
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    const assignSelect = selects[2];
    expect(assignSelect).toHaveValue("");
  });

  it("shows the assigned agent selected in the dropdown", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE, AGENT_BOB] });
      return Promise.resolve({ data: makeTicket({ assignedTo: AGENT_ALICE }) });
    });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    expect(selects[2]).toHaveValue(AGENT_ALICE.id);
  });

  it("dropdown lists all agents from /agents endpoint", async () => {
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob" })).toBeInTheDocument();
  });

  it("dropdown includes an 'Unassigned' option", async () => {
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Assignee — mutation
// ---------------------------------------------------------------------------

describe("TicketDetailPage — assign mutation", () => {
  it("calls PATCH /tickets/:id/assign with the selected userId", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: AGENT_ALICE } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[2], AGENT_ALICE.id);
    expect(mockPatch).toHaveBeenCalledWith(
      "/tickets/ticket-1/assign",
      { userId: AGENT_ALICE.id }
    );
  });

  it("calls PATCH with userId null when 'Unassigned' is selected", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE, AGENT_BOB] });
      return Promise.resolve({ data: makeTicket({ assignedTo: AGENT_ALICE }) });
    });
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: null } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[2], "");
    expect(mockPatch).toHaveBeenCalledWith(
      "/tickets/ticket-1/assign",
      { userId: null }
    );
  });

  it("updates the dropdown to reflect the new assignee after success", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: AGENT_BOB } });
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[2], AGENT_BOB.id);
    await waitFor(() => expect(selects[2]).toHaveValue(AGENT_BOB.id));
  });

  it("disables the assign dropdown while the mutation is in flight", async () => {
    let resolve!: (v: unknown) => void;
    mockPatch.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderPage();
    await screen.findByText("Login issue");
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[2], AGENT_ALICE.id);
    expect(selects[2]).toBeDisabled();
    resolve({ data: { id: "ticket-1", assignedTo: AGENT_ALICE } });
  });
});

// ---------------------------------------------------------------------------
// Assignee — agent role restrictions
// ---------------------------------------------------------------------------

describe("TicketDetailPage — assign (agent role)", () => {
  beforeEach(() => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: { user: AGENT_USER } });
  });

  it("shows 'Assign to me' button when ticket is unassigned", async () => {
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getByRole("button", { name: "Assign to me" })).toBeInTheDocument();
    // Only status and category selects, no assign combobox
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("clicking 'Assign to me' calls PATCH with the agent's own id", async () => {
    mockPatch.mockResolvedValue({ data: { id: "ticket-1", assignedTo: AGENT_USER } });
    renderPage();
    await screen.findByText("Login issue");
    await userEvent.click(screen.getByRole("button", { name: "Assign to me" }));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/ticket-1/assign", { userId: AGENT_USER.id });
  });

  it("shows 'You' with a lock when the ticket is assigned to the current agent", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_ALICE] });
      return Promise.resolve({ data: makeTicket({ assignedTo: AGENT_USER }) });
    });
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
  });

  it("shows the other agent's name (read-only) when assigned to someone else", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/agents") return Promise.resolve({ data: [AGENT_BOB] });
      return Promise.resolve({ data: makeTicket({ assignedTo: AGENT_BOB }) });
    });
    renderPage();
    await screen.findByText("Login issue");
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
  });
});
