import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignInEmail = vi.hoisted(() => vi.fn());

vi.mock("../lib/auth-client", () => ({
  signIn: { email: mockSignInEmail },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSignInEmail.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe("LoginPage — layout", () => {
  it("shows the Sign in heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows email and password fields and a submit button", () => {
    renderPage();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("does not show validation errors on initial render", () => {
    renderPage();
    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Password is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter a valid email")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

describe("LoginPage — form validation", () => {
  it("shows email and password required errors on empty submission", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows invalid email error for a malformed email", async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "anypassword");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
  });

  it("shows password required error when only email is provided", async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText("Email"), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Submission states
// ---------------------------------------------------------------------------

describe("LoginPage — submission", () => {
  it("shows Signing in... while the request is in flight", async () => {
    let resolve!: () => void;
    mockSignInEmail.mockImplementation(
      (_data: unknown, { onSuccess }: { onSuccess: () => void }) =>
        new Promise<void>((res) => {
          resolve = () => { onSuccess(); res(); };
        })
    );

    renderPage();
    await userEvent.type(screen.getByLabelText("Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Signing in..." })).toBeDisabled();
    resolve();
  });

  it("shows server error message when sign in fails", async () => {
    mockSignInEmail.mockImplementation(
      (_data: unknown, { onError }: { onError: (ctx: { error: { message: string } }) => void }) => {
        onError({ error: { message: "Invalid credentials" } });
        return Promise.resolve();
      }
    );

    renderPage();
    await userEvent.type(screen.getByLabelText("Email"), "admin@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
