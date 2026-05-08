---
name: Auth Tests Coverage
description: What is covered in e2e/auth.spec.ts and key decisions made during authoring
type: project
---

## File: `e2e/auth.spec.ts`

### Covered scenarios (34 tests across 7 describe blocks)

1. **Login form validation** (client-side, Zod + react-hook-form)
   - Empty form → both errors shown simultaneously
   - Email only → password required
   - Malformed email → "Enter a valid email"
   - No errors on initial render

2. **Login success**
   - Admin and agent each land on `/` after login
   - Navbar shows correct user name per role
   - Sign out button visible after login
   - Submit button transitions to "Signing in..." (tested via route delay)

3. **Login failure**
   - Wrong password → server error message visible, stays on /login
   - Non-existent email → server error message visible
   - Sign-up attempt with unknown email → rejected (disableSignUp: true)

4. **Session persistence**
   - Authenticated user visiting /login sees the form (NO redirect — /login has no auth guard)
   - Sign out → redirected to /login
   - Post-sign-out: /  redirects to /login
   - Post-sign-out: /users redirects to /login

5. **Protected routes — unauthenticated**
   - / → /login
   - /users → /login
   - /login accessible without session

6. **Role-based access — /users page**
   - Admin can access /users
   - Agent visiting /users redirected to /
   - Agent direct URL to /users still redirected to /

7. **Navbar role-based visibility**
   - Admin sees "Users" link; agent does not
   - Admin "Users" link navigates to /users
   - Both roles see their own name and Sign out button

8. **API error simulation**
   - Mocked 500 from /api/auth/sign-in/email → error visible, stays on /login

### Key decisions / gotchas

- `/login` has NO auth guard in `App.tsx` — authenticated users visiting /login are NOT redirected. Test reflects this accurately.
- Error message text from Better Auth for invalid credentials is not deterministic (could be "Invalid", "Incorrect", "credentials") — tests use `.or()` chained locators to handle variations.
- "stays on /login after failed login" uses a CSS locator fallback (`p.text-red-600`) because the server error `<p>` has no accessible role — acceptable as a last resort here.
- Loading state test uses `page.route()` delay (200ms setTimeout in handler) — not `waitForTimeout`.

### Features NOT yet tested (future work)
- Ticket management
- Task management
- Knowledge base
- Admin user management (UsersPage is currently a stub)
- AI summaries and suggested replies
