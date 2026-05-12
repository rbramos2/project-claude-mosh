import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { UsersPage } from "./UsersPage";

// ---------------------------------------------------------------------------
// Stable mock references — declared before vi.mock so the factory can close
// over them. These are the same vi.fn() objects the component's `api` will use.
// ---------------------------------------------------------------------------

const { mockGet, mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete })),
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

const ADMIN = { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" as const, createdAt: "2024-01-01T00:00:00.000Z" };
const AGENT = { id: "agent-1", name: "Agent", email: "agent@example.com", role: "agent" as const, createdAt: "2024-01-02T00:00:00.000Z" };

function axiosErr(message: string) {
  return Object.assign(new Error(message), {
    __isAxiosError: true,
    response: { data: { error: message } },
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: ADMIN.id, name: ADMIN.name, role: "admin" } },
  });
  mockGet.mockResolvedValue({ data: [ADMIN, AGENT] });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("loading state", () => {
  it("shows skeleton rows while fetching", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// User list
// ---------------------------------------------------------------------------

describe("user list", () => {
  it("renders users returned by the API", async () => {
    renderPage();
    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
  });

  it("marks the current user's row with (you)", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("shows a static role badge on the current user's row, not a dropdown", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    const selfRow = screen.getByText("(you)").closest("tr")!;
    expect(within(selfRow).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(selfRow).getByText("admin")).toBeInTheDocument();
  });

  it("shows a role dropdown on other users' rows", async () => {
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    expect(within(agentRow).getByRole("combobox")).toBeInTheDocument();
  });

  it("does not show a Delete button on the current user's row", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    const selfRow = screen.getByText("(you)").closest("tr")!;
    expect(within(selfRow).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows a Delete button on other users' rows", async () => {
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    expect(within(agentRow).getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows 'No users found' when the list is empty", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText("No users found.")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    mockGet.mockRejectedValue(axiosErr("Internal server error"));
    renderPage();
    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add User form toggle
// ---------------------------------------------------------------------------

describe("Add User form", () => {
  it("is hidden by default", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument();
  });

  it("appears when Add User is clicked", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    expect(screen.getByRole("heading", { name: "New User" })).toBeInTheDocument();
  });

  it("hides when Cancel is clicked", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument();
  });

  it("hides when clicking the backdrop outside the modal", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument();
  });

  it("hides when Escape is pressed", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Create user — validation
// ---------------------------------------------------------------------------

describe("create user validation", () => {
  beforeEach(async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
  });

  it("shows Name is required when name is empty", async () => {
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
  });

  it("shows Email is required when email is empty", async () => {
    await userEvent.type(screen.getByLabelText("Name"), "Test");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  it("shows invalid email error for malformed email", async () => {
    await userEvent.type(screen.getByLabelText("Name"), "Test");
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
  });

  it("shows password too short error", async () => {
    await userEvent.type(screen.getByLabelText("Name"), "Test");
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
  });

  it("shows name and email errors at once on empty submission", async () => {
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("shows Password is required when only password is missing in create mode", async () => {
    await userEvent.type(screen.getByLabelText("Name"), "Test");
    await userEvent.type(screen.getByLabelText("Email"), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Create user — form behaviour
// ---------------------------------------------------------------------------

describe("create user form behaviour", () => {
  it("hides when the × button is clicked", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument();
  });

  it("shows 'Creating…' on the submit button while the request is in flight", async () => {
    let resolve!: (v: unknown) => void;
    mockPost.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    await screen.findByText("admin@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.type(screen.getByLabelText("Name"), "New User");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    expect(await screen.findByRole("button", { name: "Creating..." })).toBeDisabled();
    resolve({ data: { id: "x", name: "New User", email: "new@example.com", role: "agent", createdAt: "" } });
  });

  it("POSTs name, email and password to /users", async () => {
    mockPost.mockResolvedValue({ data: { id: "x", name: "Alice", email: "alice@example.com", role: "agent", createdAt: "" } });
    renderPage();
    await screen.findByText("admin@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.type(screen.getByLabelText("Name"), "Alice");
    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/users", {
      name: "Alice",
      email: "alice@example.com",
      password: "secret123",
    }));
  });

  it("resets fields when the modal is closed and reopened", async () => {
    renderPage();
    await screen.findByText("admin@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.type(screen.getByLabelText("Name"), "Half-typed");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Create user — happy path & server error
// ---------------------------------------------------------------------------

describe("create user", () => {
  it("closes the form and adds the new row on success", async () => {
    const newUser = { id: "new-1", name: "New User", email: "new@example.com", role: "agent" as const, createdAt: "2024-01-03T00:00:00.000Z" };
    mockPost.mockResolvedValue({ data: newUser });
    renderPage();
    await screen.findByText("admin@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.type(screen.getByLabelText("Name"), "New User");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "New User" })).not.toBeInTheDocument()
    );
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
  });

  it("keeps the form open and shows the server error on failure", async () => {
    mockPost.mockRejectedValue(axiosErr("A user with this email already exists"));
    renderPage();
    await screen.findByText("admin@example.com");

    await userEvent.click(screen.getByRole("button", { name: "Add User" }));
    await userEvent.type(screen.getByLabelText("Name"), "Admin");
    await userEvent.type(screen.getByLabelText("Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));

    expect(await screen.findByText("A user with this email already exists")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New User" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit user
// ---------------------------------------------------------------------------

describe("edit user", () => {
  it("shows an Edit button on every row", async () => {
    renderPage();
    await screen.findByText("admin@example.com");
    const dataRows = screen.getAllByRole("row").slice(1);
    dataRows.forEach((row) => {
      expect(within(row).getByRole("button", { name: "Edit user" })).toBeInTheDocument();
    });
  });

  it("opens 'Edit User' modal pre-populated with the user's data", async () => {
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Edit user" }));

    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe("Agent");
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe("agent@example.com");
    expect(screen.getByLabelText<HTMLInputElement>(/^Password/).value).toBe("");
  });

  it("PATCHes /users/:id with empty password when no password is provided", async () => {
    mockPatch.mockResolvedValue({ data: { ...AGENT, name: "Agent Updated" } });
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Edit user" }));

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Agent Updated");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/users/agent-1", {
        name: "Agent Updated",
        email: "agent@example.com",
        password: "",
      }),
    );
  });

  it("includes the new password in PATCH when provided", async () => {
    mockPatch.mockResolvedValue({ data: AGENT });
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Edit user" }));

    await userEvent.type(screen.getByLabelText(/^Password/), "newpassword123");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/users/agent-1", {
        name: "Agent",
        email: "agent@example.com",
        password: "newpassword123",
      }),
    );
  });

  it("closes modal and updates the row in place on success", async () => {
    mockPatch.mockResolvedValue({ data: { ...AGENT, name: "Agent Renamed" } });
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Edit user" }));

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Agent Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Edit User" })).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Agent Renamed")).toBeInTheDocument();
  });

  it("keeps modal open and shows server error on failure", async () => {
    mockPatch.mockRejectedValue(axiosErr("A user with this email already exists"));
    renderPage();
    await screen.findByText("agent@example.com");
    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Edit user" }));

    await userEvent.clear(screen.getByLabelText("Email"));
    await userEvent.type(screen.getByLabelText("Email"), "admin@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("A user with this email already exists")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Role change
// ---------------------------------------------------------------------------

describe("role change", () => {
  it("calls PATCH and updates the dropdown on success", async () => {
    mockPatch.mockResolvedValue({ data: { ...AGENT, role: "admin" } });
    renderPage();
    await screen.findByText("agent@example.com");

    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.selectOptions(within(agentRow).getByRole("combobox"), "admin");

    expect(mockPatch).toHaveBeenCalledWith("/users/agent-1/role", { role: "admin" });
    await waitFor(() =>
      expect(within(agentRow).getByRole("combobox")).toHaveValue("admin")
    );
  });

  it("shows an action error when PATCH fails", async () => {
    mockPatch.mockRejectedValue(axiosErr("Cannot change your own role"));
    renderPage();
    await screen.findByText("agent@example.com");

    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.selectOptions(within(agentRow).getByRole("combobox"), "admin");

    expect(await screen.findByText("Cannot change your own role")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Delete user
// ---------------------------------------------------------------------------

describe("delete user", () => {
  it("removes the row after confirming deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDelete.mockResolvedValue({});
    renderPage();
    await screen.findByText("agent@example.com");

    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Delete" }));

    expect(mockDelete).toHaveBeenCalledWith("/users/agent-1");
    await waitFor(() =>
      expect(screen.queryByText("agent@example.com")).not.toBeInTheDocument()
    );
  });

  it("does not delete when the confirm dialog is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();
    await screen.findByText("agent@example.com");

    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Delete" }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
  });

  it("shows an action error when DELETE fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockDelete.mockRejectedValue(axiosErr("User not found"));
    renderPage();
    await screen.findByText("agent@example.com");

    const agentRow = screen.getByText("agent@example.com").closest("tr")!;
    await userEvent.click(within(agentRow).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("User not found")).toBeInTheDocument();
  });
});
