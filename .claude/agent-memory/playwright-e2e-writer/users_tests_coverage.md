---
name: Users Page Tests Coverage
description: What is covered in e2e/users.spec.ts and key decisions made during authoring
type: project
---

## File: `e2e/users.spec.ts`

### Covered scenarios (27 tests across 8 describe blocks)

1. **Access control** — admin can reach /users; agent is redirected to /

2. **User list display** — seeded admin/agent rows visible; "(you)" label on own row; column headers present

3. **Self-row restrictions** — own row has a static `<span>` badge (not `<select>`); no Delete button

4. **Add User form toggle** — button shows form; Cancel hides form; button label toggles Add User ↔ Cancel

5. **Create user — happy path** — create agent user and admin user; form closes on success; new row appears

6. **Create user — validation** — Zod client-side: name required, email required, invalid email, password < 8 chars, all fields empty at once

7. **Duplicate email (server error)** — submitting with an existing email shows "A user with this email already exists"; form stays open

8. **Role change** — agent row dropdown starts at "agent"; selectOption("admin") persists; round-trip change works

9. **Delete user** — accept confirm dialog removes row; dismiss confirm dialog leaves row intact; self row has no Delete button

10. **API error simulation** — mocked 500 on GET /api/users shows fetchError text inline

### Key decisions / gotchas

- Tests that create users (create, delete, cancel-delete) each create their own disposable user with a unique email to stay independent of the seeded fixtures and avoid order-dependency.
- Role change tests operate on the seeded agent row — they change role twice (agent → admin → agent) to avoid leaking state that would break the "dropdown starts at agent" assertion in the second test.
- `adminPage.once("dialog", ...)` (not `.on`) is used for the confirm dialog so the handler fires exactly once per test.
- The self-row is located via `.filter({ hasText: "(you)" })` — robust regardless of row order.
- Other-user rows are located via `.filter({ hasText: <email> })` to avoid ambiguity if multiple rows share a name.
- `not.toBeAttached()` is used to assert absence of a Delete button / select on the self row — this catches the element being absent from the DOM entirely, not just hidden.
- The `goToUsersPage` helper waits for the heading AND for "Loading..." to disappear before tests interact with the table.
- `getByRole("cell", { name: ... })` is used for table cell assertions — accessible and unambiguous.

### Features NOT yet tested (future work)
- Ticket management
- Task management
- Knowledge base
- AI summaries and suggested replies
