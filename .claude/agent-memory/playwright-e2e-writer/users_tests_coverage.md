---
name: Users Page Tests Coverage
description: What is covered in e2e/users.spec.ts and key decisions made during authoring
type: project
---

## File: `e2e/users.spec.ts`

### Covered scenarios (happy-path only, 16 tests across 5 describe blocks)

1. **List** — column headers visible; seeded admin/agent rows present; "(you)" label on own row

2. **Create** — "Add User" opens "New User" modal; successful submit closes modal and adds row to table; Cancel closes modal without creating; Escape key closes modal

3. **Edit** — pencil icon (`aria-label="Edit user"`) opens "Edit User" modal pre-populated with user data; saving updated name closes modal and table reflects change; Cancel closes modal without saving

4. **Delete** — Delete button opens "Delete User" confirmation modal with user's name in copy; confirming with the red Delete button (inside `data-testid="delete-modal-backdrop"`) removes the row; Cancel keeps the row; own row has no Delete button

5. **Role change** — inline `<select>` in non-self rows starts at "agent" for newly created users; selectOption("admin") updates the dropdown after PATCH resolves

### Key decisions / gotchas

- The delete confirmation is a custom modal (NOT a browser `window.confirm` dialog). It is identified by `data-testid="delete-modal-backdrop"`. Do not use `page.once("dialog", ...)` — that targets native browser dialogs.
- Tests that need a user to act on (edit, delete, role-change) each create a unique throwaway user via the create flow using `Date.now()` in the name/email. This keeps tests independent of each other and of seeded fixture state.
- The role-change test creates its own user (starts as "agent" by default) rather than mutating the seeded agent user to avoid leaking state.
- Self-row is located via `.filter({ hasText: "(you)" })`. Own row has a `<span>` badge instead of `<select>` and has no Delete button — asserted with `not.toBeAttached()`.
- All non-self user rows are targeted via `.filter({ hasText: <email> })` for specificity.
- `goToUsers` helper just waits for the "Users" heading — no "Loading..." text to wait for (the component uses skeleton rows, not a Loading... text node).
- The password label in edit mode is "Password (leave blank to keep current)" — matched with `getByLabel(/Password/)` to avoid the exact-string mismatch.
- The edit button uses `aria-label="Edit user"` — targeted with `getByRole("button", { name: "Edit user" })`.

### Features NOT yet tested (future work)
- Task management
- Knowledge base
- AI summaries and suggested replies

---

## File: `e2e/ticket-detail.spec.ts`

### Covered scenarios (10 tests across 7 describe blocks, all under one `test.describe("TicketDetailPage")`)

1. **Navigation** — clicking a ticket row on `/tickets` navigates to `/tickets/:id`; "All tickets" back button returns to `/tickets`

2. **Layout** — subject heading, client email (`customer@example.com`), and message count (`/\d+ messages?/`) are all visible

3. **Message thread** — the "customer" badge is visible for the inbound mock message

4. **Status change** — admin selects "closed" from combobox index 0; value updates; persists after reload; test resets status to "open" via API before and after

5. **Category change** — admin selects "billing" from combobox index 1; persists after reload; original category restored via API

6. **Assign (admin)** — ticket unassigned via API first; admin assign dropdown (combobox index 2) starts at ""; agent selected by ID (fetched from `/api/agents`); then unassigned back to ""

7. **Assign (agent)** — ticket unassigned via a fresh admin browser context; agent sees "Assign to me" button; after click shows "You" text; button disappears

8. **Reply form happy path** — Send disabled when empty; fill textarea; Send enabled; click; new message body appears in thread; textarea clears; "agent" badge visible

9. **Reply form empty** — Send disabled when empty; disabled for whitespace-only input (component trims)

10. **Protected route** — fresh browser context with no session navigates to `/tickets/:id` and is redirected to `/login`

### Key decisions / gotchas

- `beforeAll` creates one shared ticket via `getOrCreateTicketId` (webhook trigger + ticket list fetch). Individual tests navigate to the detail page themselves.
- `getOrCreateTicketId` must be called from a page already holding a session cookie (requireAuth on `GET /api/tickets`). `beforeAll` spins up its own admin browser context for this.
- The three `<select>` controls on the detail page map to: `nth(0)` = status, `nth(1)` = category, `nth(2)` = assign (admin only). This matches the DOM order in `TicketDetailPage.tsx`.
- Assign tests reset the ticket to "unassigned" via `PATCH /api/tickets/:id/assign` with `{ userId: null }` before asserting. Only admins can unassign — the agent assign test opens a temporary admin context to do the reset.
- The "Assign to me" button is matched with `getByRole("button", { name: /assign to me/i })`. After self-assignment it is replaced by the text "You" (not a button).
- `AGENT_NAME` is imported from the auth fixture (`"Agent"`) — used to find the agent in the `/api/agents` list.
- Ticket status/category are restored after mutation tests so subsequent tests in the suite see a clean ticket state.

---

## File: `e2e/webhook-gmail.spec.ts`

### Covered scenarios (10 tests across 4 describe blocks)

1. **Secret validation** — missing secret → 401; wrong secret → 401; empty string secret → 401

2. **Body validation** — empty body → 400 "Missing message data"; `message.data` missing → 400; invalid base64 → 400 "Invalid message data"; valid base64 decoding to non-JSON → 400

3. **Unknown email (no-op)** — valid secret + valid payload for email not in GmailSyncState → 204; confirms via `GET /api/tickets` that no ticket was created

4. **Happy path (GMAIL_MOCK=true)** — POST webhook for `support@helpdesk.com` (seeded) → 204 + ticket created with subject "Test support email" and clientEmail "customer@example.com"; idempotency: second POST with same mock_msg_001 messageId → still exactly 1 ticket with 1 message; handler completion verified via health check

### Key decisions / gotchas

- The webhook endpoint is at `http://localhost:3000/webhooks/gmail` (not under `/api/`). Always use `request.newContext({ baseURL: BACKEND_URL })` to hit the backend directly.
- `GMAIL_MOCK=true` and `GMAIL_WEBHOOK_SECRET=test-webhook-secret` are already set in `playwright.config.ts` webServer env — no changes needed there.
- `GmailSyncState` for `support@helpdesk.com` is seeded in `global-setup.ts` via `seed-gmail-sync-state.ts` with historyId "1000".
- Tickets/messages are wiped in global setup via `cleanup-test-tickets.ts` before each suite, so the happy-path test always starts clean.
- Ticket verification is done by logging in as admin (`loginAs`) and calling `GET /api/tickets` via `page.request` (which carries the session cookie). The `request` fixture from Playwright does not carry cookies from the browser context.
- The idempotency test relies on the handler's `prisma.message.findUnique({ where: { gmailMessageId } })` guard — duplicate message IDs are silently skipped.
- The historyId-update test uses the 204 response as a proxy for "handler ran to completion" since Playwright cannot query the DB directly.
- `encodeNotification` helper mirrors what Google Pub/Sub sends: `Buffer.from(JSON.stringify(payload)).toString("base64")`.
