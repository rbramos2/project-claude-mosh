import { test, expect, AGENT_NAME } from "./fixtures/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKEND = "http://localhost:3000";
const WEBHOOK_URL = `${BACKEND}/webhooks/gmail?secret=test-webhook-secret`;
const MOCK_EMAIL = "support@helpdesk.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function webhookPayload() {
  return {
    message: {
      data: Buffer.from(
        JSON.stringify({ emailAddress: MOCK_EMAIL, historyId: "1000" })
      ).toString("base64"),
    },
  };
}

async function getOrCreateTicketId(page: import("@playwright/test").Page): Promise<string> {
  await page.request.post(WEBHOOK_URL, { data: webhookPayload() });

  const res = await page.request.get(`${BACKEND}/api/tickets`);
  const { tickets } = await res.json();
  const ticket = tickets.find((t: { subject: string }) => t.subject === "Test support email");

  if (!ticket) throw new Error("Seeded ticket not found after webhook trigger");
  return ticket.id as string;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe("TicketDetailPage", () => {
  // Shared ticket ID — created once for the whole describe block via adminPage.
  // Each test navigates to the detail page itself so they remain independent.
  let ticketId: string;

  test.beforeAll(async ({ browser }) => {
    // Use a dedicated context so we don't depend on which fixture runs first.
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in as admin to satisfy requireAuth on the tickets API.
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");

    ticketId = await getOrCreateTicketId(page);
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Navigation — ticket list → detail → back
  // ---------------------------------------------------------------------------

  test.describe("Navigation", () => {
    test("clicking a ticket row on /tickets navigates to the detail URL", async ({
      adminPage,
    }) => {
      await adminPage.goto("/tickets");
      await adminPage
        .getByRole("link", { name: "Test support email" })
        .first()
        .click();
      await adminPage.waitForURL(`/tickets/${ticketId}`);
      await expect(adminPage).toHaveURL(`/tickets/${ticketId}`);
    });

    test("back button returns to /tickets", async ({ adminPage }) => {
      await adminPage.goto(`/tickets/${ticketId}`);
      await adminPage.getByRole("button", { name: "All tickets" }).click();
      await adminPage.waitForURL("/tickets");
      await expect(adminPage).toHaveURL("/tickets");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Status change — admin closes ticket, persists after reload
  // ---------------------------------------------------------------------------

  test.describe("Status change", () => {
    test("admin changes status from open to closed and it persists after reload", async ({
      adminPage,
    }) => {
      await adminPage.goto(`/tickets/${ticketId}`);

      // Reset to "open" first via API so the test is idempotent.
      await adminPage.request.patch(`${BACKEND}/api/tickets/${ticketId}`, {
        data: { status: "open" },
      });
      await adminPage.reload();

      const statusSelect = adminPage.getByRole("combobox").nth(0);
      await expect(statusSelect).toHaveValue("open");

      await statusSelect.selectOption("closed");

      // Wait for the optimistic update to settle.
      await expect(statusSelect).toHaveValue("closed");

      // Reload and verify persistence.
      await adminPage.reload();
      await expect(adminPage.getByRole("combobox").nth(0)).toHaveValue("closed");

      // Restore for other tests.
      await adminPage.request.patch(`${BACKEND}/api/tickets/${ticketId}`, {
        data: { status: "open" },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Category change — admin sets billing, persists after reload
  // ---------------------------------------------------------------------------

  test.describe("Category change", () => {
    test("admin changes category to billing and it persists after reload", async ({
      adminPage,
    }) => {
      await adminPage.goto(`/tickets/${ticketId}`);

      // Read current category so we can restore it afterwards.
      const res = await adminPage.request.get(`${BACKEND}/api/tickets/${ticketId}`);
      const { category: originalCategory } = await res.json();

      const categorySelect = adminPage.getByRole("combobox").nth(1);
      await categorySelect.selectOption("billing");
      await expect(categorySelect).toHaveValue("billing");

      await adminPage.reload();
      await expect(adminPage.getByRole("combobox").nth(1)).toHaveValue("billing");

      // Restore.
      await adminPage.request.patch(`${BACKEND}/api/tickets/${ticketId}`, {
        data: { category: originalCategory },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Assign — admin perspective
  // ---------------------------------------------------------------------------

  test.describe("Assign (admin)", () => {
    test("admin assigns ticket to agent then unassigns back to Unassigned", async ({
      adminPage,
    }) => {
      // Ensure the ticket starts unassigned.
      await adminPage.request.patch(`${BACKEND}/api/tickets/${ticketId}/assign`, {
        data: { userId: null },
      });

      await adminPage.goto(`/tickets/${ticketId}`);

      const assignSelect = adminPage.getByRole("combobox").nth(2);
      await expect(assignSelect).toHaveValue("");

      // Fetch the agent's user ID from the agents list.
      const agentsRes = await adminPage.request.get(`${BACKEND}/api/agents`);
      const agents: Array<{ id: string; name: string }> = await agentsRes.json();
      const agentUser = agents.find((a) => a.name === AGENT_NAME);
      if (!agentUser) throw new Error("Agent user not found in /api/agents");

      // Assign to agent.
      await assignSelect.selectOption(agentUser.id);
      await expect(assignSelect).toHaveValue(agentUser.id);

      // Unassign.
      await assignSelect.selectOption("");
      await expect(assignSelect).toHaveValue("");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Assign — agent perspective
  // ---------------------------------------------------------------------------

  test.describe("Assign (agent)", () => {
    test("agent sees Assign to me button, clicking it shows You, and the button disappears", async ({
      agentPage,
    }) => {
      // Ensure the ticket is unassigned so the agent sees the button.
      // We need admin credentials to unassign — do it via the adminPage fixture
      // in a separate context.
      // Use a raw request with admin session: simplest approach is a fresh browser context.
      const browser = agentPage.context().browser()!;
      const adminCtx = await browser.newContext();
      const adminPage = await adminCtx.newPage();
      await adminPage.goto("/login");
      await adminPage.getByLabel("Email").fill("admin@example.com");
      await adminPage.getByLabel("Password").fill("password123");
      await adminPage.getByRole("button", { name: "Sign in" }).click();
      await adminPage.waitForURL("/");
      await adminPage.request.patch(`${BACKEND}/api/tickets/${ticketId}/assign`, {
        data: { userId: null },
      });
      await adminCtx.close();

      await agentPage.goto(`/tickets/${ticketId}`);

      const assignBtn = agentPage.getByRole("button", { name: /assign to me/i });
      await expect(assignBtn).toBeVisible();

      await assignBtn.click();

      // After assignment, "You" text should appear and button should be gone.
      await expect(agentPage.getByText("You")).toBeVisible();
      await expect(agentPage.getByRole("button", { name: /assign to me/i })).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Reply form — message persists in real DB
  // ---------------------------------------------------------------------------

  test.describe("Reply form", () => {
    test("submitting a reply posts the message and it persists after reload", async ({
      adminPage,
    }) => {
      await adminPage.goto(`/tickets/${ticketId}`);

      const replyBody = "This is an automated E2E reply from admin.";
      await adminPage.getByPlaceholder("Write a reply…").fill(replyBody);
      await adminPage.getByRole("button", { name: /send reply/i }).click();

      // Message appears immediately in the thread.
      await expect(adminPage.getByText(replyBody)).toBeVisible();

      // Reload — message must still be there (real DB write, not just optimistic update).
      await adminPage.reload();
      await expect(adminPage.getByText(replyBody)).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Protected route — unauthenticated access redirects to /login
  // ---------------------------------------------------------------------------

  test.describe("Protected route", () => {
    test("unauthenticated request to /tickets/:id redirects to /login", async ({
      browser,
    }) => {
      // Fresh context with no session cookie.
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`/tickets/${ticketId}`);
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");

      await context.close();
    });
  });
});
