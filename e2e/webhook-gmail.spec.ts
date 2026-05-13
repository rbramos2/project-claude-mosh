import { test, expect } from "@playwright/test";
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from "./fixtures/auth";

const BACKEND = "http://localhost:3000";
const WEBHOOK_SECRET = "test-webhook-secret";
const MOCK_EMAIL = "support@helpdesk.com";
const UNKNOWN_EMAIL = "nobody@notregistered.com";

function encodeNotification(payload: Record<string, string>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// ---------------------------------------------------------------------------
// Secret validation
// ---------------------------------------------------------------------------

test.describe("Gmail webhook — secret validation", () => {
  test("returns 401 when secret query param is missing", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail`, {
      data: { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  test("returns 401 when secret query param is wrong", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=wrong-secret`, {
      data: { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  test("returns 401 when secret is the empty string", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=`, {
      data: { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Body validation
// ---------------------------------------------------------------------------

test.describe("Gmail webhook — body validation", () => {
  test("returns 400 when request body is empty", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: {},
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("Missing message data");
  });

  test("returns 400 when message.data field is missing", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: {} },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("Missing message data");
  });

  test("returns 400 when message.data is not valid base64 JSON", async ({ request }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: { data: "this-is-not-base64-json!!!!" } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("Invalid message data");
  });

  test("returns 400 when message.data is valid base64 but decodes to non-JSON", async ({ request }) => {
    const notJson = Buffer.from("hello, not json").toString("base64");
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: { data: notJson } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("Invalid message data");
  });
});

// ---------------------------------------------------------------------------
// Unknown email — no-op
// ---------------------------------------------------------------------------

test.describe("Gmail webhook — unknown email address (no-op)", () => {
  test("returns 204 and creates no ticket when emailAddress has no GmailSyncState", async ({
    request,
    page,
  }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: { data: encodeNotification({ emailAddress: UNKNOWN_EMAIL, historyId: "5000" }) } },
    });
    expect(res.status()).toBe(204);

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const ticketsRes = await page.request.get(`${BACKEND}/api/tickets`);
    const tickets: Array<{ clientEmail: string }> = await ticketsRes.json();
    expect(tickets.filter((t) => t.clientEmail === UNKNOWN_EMAIL)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path — GMAIL_MOCK=true
// ---------------------------------------------------------------------------

test.describe("Gmail webhook — happy path (GMAIL_MOCK=true)", () => {
  // GMAIL_MOCK=true is set in playwright.config.ts webServer env.
  // GmailSyncState for MOCK_EMAIL is seeded in global-setup.ts (historyId "1000").
  // Mock returns: message id "mock_msg_001", From "customer@example.com", Subject "Test support email".

  test("returns 204 and creates a ticket with the mock message", async ({ request, page }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } },
    });
    expect(res.status()).toBe(204);

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const tickets: Array<{ subject: string; clientEmail: string; status: string }> =
      await page.request.get(`${BACKEND}/api/tickets`).then((r) => r.json());

    const created = tickets.find(
      (t) => t.subject === "Test support email" && t.clientEmail === "customer@example.com"
    );
    expect(created).toBeDefined();
    expect(created!.status).toBe("open");
  });

  test("duplicate webhook does not create a second message row", async ({ request, page }) => {
    const payload = { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } };
    const url = `${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`;

    expect((await request.post(url, { data: payload })).status()).toBe(204);
    expect((await request.post(url, { data: payload })).status()).toBe(204);

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const tickets: Array<{ subject: string; _count: { messages: number } }> =
      await page.request.get(`${BACKEND}/api/tickets`).then((r) => r.json());

    const matching = tickets.filter((t) => t.subject === "Test support email");
    expect(matching).toHaveLength(1);
    expect(matching[0]._count.messages).toBe(1);
  });

  test("server remains healthy after webhook processes a message", async ({ request, page }) => {
    const res = await request.post(`${BACKEND}/webhooks/gmail?secret=${WEBHOOK_SECRET}`, {
      data: { message: { data: encodeNotification({ emailAddress: MOCK_EMAIL, historyId: "1000" }) } },
    });
    expect(res.status()).toBe(204);

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const health = await page.request.get(`${BACKEND}/api/health`);
    expect(health.status()).toBe(200);
  });
});
