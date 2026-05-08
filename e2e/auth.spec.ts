import { test as base, expect } from "@playwright/test";
import {
  test,
  loginAs,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  AGENT_EMAIL,
  AGENT_PASSWORD,
  AGENT_NAME,
} from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Login form — client-side validation
// ---------------------------------------------------------------------------

base.describe("Login form validation", () => {
  base.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  base.test("shows heading and submit button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });

  base.test("shows email required error on empty submission", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
  });

  base.test("shows password required error on empty submission", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  base.test("shows both field errors simultaneously on empty submission", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  base.test("shows invalid email error for malformed email", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anypassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });

  base.test("shows password required error when only email is provided", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  base.test("does not show validation errors on initial render", async ({
    page,
  }) => {
    await expect(page.getByText("Email is required")).not.toBeVisible();
    await expect(page.getByText("Password is required")).not.toBeVisible();
    await expect(page.getByText("Enter a valid email")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login success
// ---------------------------------------------------------------------------

base.describe("Login success", () => {
  base.test("admin logs in and lands on /", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL("/");
  });

  base.test("agent logs in and lands on /", async ({ page }) => {
    await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
    await expect(page).toHaveURL("/");
  });

  base.test("navbar shows admin name after login", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByText(ADMIN_NAME)).toBeVisible();
  });

  base.test("navbar shows agent name after login", async ({ page }) => {
    await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
    await expect(page.getByText(AGENT_NAME)).toBeVisible();
  });

  base.test("navbar shows Sign out button after login", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(
      page.getByRole("button", { name: "Sign out" })
    ).toBeVisible();
  });

  base.test("submit button shows loading state while signing in", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);

    // Intercept the auth request to observe intermediate state.
    // We delay the response so the button has time to show "Signing in..."
    await page.route("**/api/auth/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.continue();
    });

    const submitButton = page.getByRole("button", { name: /Sign in/i });
    await submitButton.click();

    await expect(page.getByRole("button", { name: "Signing in..." })).toBeVisible();
    await page.waitForURL("/");
  });
});

// ---------------------------------------------------------------------------
// Login failure
// ---------------------------------------------------------------------------

base.describe("Login failure", () => {
  base.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  base.test("shows error message for wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Better Auth returns an error message for invalid credentials
    await expect(page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))).toBeVisible();
  });

  base.test("stays on /login after failed login", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Wait for error to appear, then confirm URL has not changed
    await expect(page.locator("p.text-red-600, p.text-sm.text-red-600").last()).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  base.test("shows error message for non-existent email", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("anypassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))).toBeVisible();
  });

  base.test("sign-up attempt is rejected (sign-up is disabled)", async ({
    page,
  }) => {
    // Better Auth with disableSignUp: true returns an error when attempting
    // to sign in with credentials that have no matching account. The login
    // page has no separate register route, so we exercise the sign-in path
    // with a brand-new email and verify the server error surfaces.
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("somepassword123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

base.describe("Session persistence", () => {
  base.test("authenticated user can still visit /login (no redirect away)", async ({
    page,
  }) => {
    // The current implementation has no guard on /login, so an authenticated
    // user who navigates there will see the login form — not be redirected.
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  base.test("sign out redirects to /login", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("cannot access protected route after sign out", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    // Attempt to navigate to a protected route
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("sign out clears session — cannot access /users after sign out", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    // Verify we can reach /users while authenticated
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // Sign out
    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    // Try /users again — must redirect to /login
    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Protected routes — unauthenticated access
// ---------------------------------------------------------------------------

base.describe("Protected routes — unauthenticated", () => {
  base.test("visiting / without session redirects to /login", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("visiting /users without session redirects to /login", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("login page is accessible without a session", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Role-based access control
// ---------------------------------------------------------------------------

test.describe("Role-based access — /users page", () => {
  test("admin can access /users", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await expect(
      adminPage.getByRole("heading", { name: "Users" })
    ).toBeVisible();
    await expect(adminPage).toHaveURL("/users");
  });

  test("agent visiting /users is redirected to /", async ({ agentPage }) => {
    await agentPage.goto("/users");
    await agentPage.waitForURL("/");
    await expect(agentPage).toHaveURL("/");
  });

  test("agent cannot reach /users even with a direct URL", async ({
    agentPage,
  }) => {
    // Navigate away first, then try to force-navigate to /users
    await agentPage.goto("/");
    await agentPage.goto("/users");
    await agentPage.waitForURL("/");
    await expect(agentPage).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Role-based access control — Navbar links
// ---------------------------------------------------------------------------

test.describe("Navbar — role-based visibility", () => {
  test("admin sees the Users nav link", async ({ adminPage }) => {
    await adminPage.goto("/");
    await expect(adminPage.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("agent does not see the Users nav link", async ({ agentPage }) => {
    await agentPage.goto("/");
    await expect(
      agentPage.getByRole("link", { name: "Users" })
    ).not.toBeVisible();
  });

  test("admin Users link navigates to /users", async ({ adminPage }) => {
    await adminPage.goto("/");
    await adminPage.getByRole("link", { name: "Users" }).click();
    await adminPage.waitForURL("/users");
    await expect(adminPage).toHaveURL("/users");
  });

  test("both roles see their own name in the navbar", async ({
    adminPage,
    agentPage,
  }) => {
    await adminPage.goto("/");
    await expect(adminPage.getByText(ADMIN_NAME)).toBeVisible();

    await agentPage.goto("/");
    await expect(agentPage.getByText(AGENT_NAME)).toBeVisible();
  });

  test("both roles see the Sign out button in the navbar", async ({
    adminPage,
    agentPage,
  }) => {
    await adminPage.goto("/");
    await expect(
      adminPage.getByRole("button", { name: "Sign out" })
    ).toBeVisible();

    await agentPage.goto("/");
    await expect(
      agentPage.getByRole("button", { name: "Sign out" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API error simulation
// ---------------------------------------------------------------------------

base.describe("Login — API error handling", () => {
  base.test("shows error when auth API returns a server error", async ({
    page,
  }) => {
    await page.goto("/login");

    // Force the auth sign-in endpoint to return a 500
    await page.route("**/api/auth/sign-in/email", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal server error" }),
      });
    });

    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // The server error message from ctx.error.message should be displayed
    await expect(page.locator("p.text-sm.text-red-600, p.text-red-600").last()).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});
