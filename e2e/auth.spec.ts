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
// Login success — requires real auth server
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
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login failure — requires real auth server
// ---------------------------------------------------------------------------

base.describe("Login failure", () => {
  base.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  base.test("shows error message for wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))
    ).toBeVisible();
  });

  base.test("stays on /login after failed login", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("p.text-red-600, p.text-sm.text-red-600").last()).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  base.test("shows error for non-existent email", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("anypassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))
    ).toBeVisible();
  });

  base.test("sign-up attempt is rejected (sign-up is disabled)", async ({ page }) => {
    await page.getByLabel("Email").fill("newuser@example.com");
    await page.getByLabel("Password").fill("somepassword123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByText(/invalid/i).or(page.getByText(/incorrect/i)).or(page.getByText(/credentials/i))
    ).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Session persistence — requires real session
// ---------------------------------------------------------------------------

base.describe("Session persistence", () => {
  base.test("sign out redirects to /login", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("cannot access protected route after sign out", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("sign out clears session — cannot access /users after sign out", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Protected routes — requires real routing
// ---------------------------------------------------------------------------

base.describe("Protected routes — unauthenticated", () => {
  base.test("visiting / without session redirects to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  base.test("visiting /users without session redirects to /login", async ({ page }) => {
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
// Role-based access — requires real session
// ---------------------------------------------------------------------------

test.describe("Role-based access — /users page", () => {
  test("admin can access /users", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await expect(adminPage.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(adminPage).toHaveURL("/users");
  });

  test("agent visiting /users is redirected to /", async ({ agentPage }) => {
    await agentPage.goto("/users");
    await agentPage.waitForURL("/");
    await expect(agentPage).toHaveURL("/");
  });

  test("agent cannot reach /users even with a direct URL", async ({ agentPage }) => {
    await agentPage.goto("/");
    await agentPage.goto("/users");
    await agentPage.waitForURL("/");
    await expect(agentPage).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// Navbar — role-based visibility — requires real session
// ---------------------------------------------------------------------------

test.describe("Navbar — role-based visibility", () => {
  test("admin sees the Users nav link", async ({ adminPage }) => {
    await adminPage.goto("/");
    await expect(adminPage.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("agent does not see the Users nav link", async ({ agentPage }) => {
    await agentPage.goto("/");
    await expect(agentPage.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("admin Users link navigates to /users", async ({ adminPage }) => {
    await adminPage.goto("/");
    await adminPage.getByRole("link", { name: "Users" }).click();
    await adminPage.waitForURL("/users");
    await expect(adminPage).toHaveURL("/users");
  });

  test("both roles see their own name in the navbar", async ({ adminPage, agentPage }) => {
    await adminPage.goto("/");
    await expect(adminPage.getByText(ADMIN_NAME)).toBeVisible();

    await agentPage.goto("/");
    await expect(agentPage.getByText(AGENT_NAME)).toBeVisible();
  });

  test("both roles see the Sign out button in the navbar", async ({ adminPage, agentPage }) => {
    await adminPage.goto("/");
    await expect(adminPage.getByRole("button", { name: "Sign out" })).toBeVisible();

    await agentPage.goto("/");
    await expect(agentPage.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
