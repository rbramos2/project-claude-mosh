import { test as base, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials — kept in one place so tests never hardcode strings
// ---------------------------------------------------------------------------
export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_PASSWORD = "password123";
export const ADMIN_NAME = "Admin";

export const AGENT_EMAIL = "agent@example.com";
export const AGENT_PASSWORD = "password123";
export const AGENT_NAME = "Agent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fills the login form and waits for the post-login redirect to `/`. */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

// ---------------------------------------------------------------------------
// Custom fixtures
// ---------------------------------------------------------------------------

type AuthFixtures = {
  /** A page that is already authenticated as the admin user. */
  adminPage: Page;
  /** A page that is already authenticated as the agent user. */
  agentPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(page);
    await context.close();
  },

  agentPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
