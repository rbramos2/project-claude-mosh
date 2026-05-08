---
name: Auth Architecture Security Observations
description: Security patterns, gaps, and controls found in the Better Auth + Express + React auth implementation
type: project
---

# Auth Architecture Security Observations (audited 2026-05-08)

## Better Auth server config (server/src/lib/auth.ts)
- Uses betterAuth with Prisma adapter (PostgreSQL)
- `disableSignUp: true` — correct, admin-provisioned users only
- `role` field marked `input: false` — prevents client from setting role at sign-up
- No `session` block configured: session expiry, cookie flags (secure, httpOnly, sameSite) are all defaults — not explicitly hardened
- No `rateLimit` plugin configured — login endpoint has no brute-force protection
- BETTER_AUTH_SECRET is present in .env (good), but .env.example shipped a weak placeholder ("12345")
- trustedOrigins loaded from env var — correct pattern

## Express app (server/src/app.ts)
- CORS hardcoded to localhost origins (development only) — not loaded from env
- `express-session` is listed as a dependency but NOT used anywhere — Better Auth manages its own sessions via cookies; the unused dependency is dead weight
- No Helmet.js configured — missing security headers (CSP, HSTS, X-Frame-Options, etc.)
- No rate limiting middleware on /api/auth/* routes
- No server-side authorization middleware exists yet — ALL role/auth checks are client-side only

## Authorization model
- AdminRoute.tsx checks session.user.role === "admin" client-side — this is the ONLY role check in the entire codebase
- No API route is protected: any authenticated (or even unauthenticated) user can call any /api/* endpoint once they exist
- The role field IS stored in DB and included in session via inferAdditionalFields — foundation is correct, enforcement is missing

## Session / Cookie security
- Better Auth default session: cookie is httpOnly by default in Better Auth
- No explicit `secure: true` flag set — will not enforce HTTPS in production without config
- No explicit `sameSite` setting — Better Auth defaults to "lax"; should be verified
- Session expiry not configured — uses Better Auth default (7 days)

## Seed script (server/src/seed.ts)
- .env.example has SEED_ADMIN_PASSWORD="password123" — weak default, must be changed before any deployment
- Uses auth.$context for password hashing — correct, uses Better Auth's own hasher
- Upsert logic: `update: {}` means re-running seed does NOT update an existing admin's password — safe from accidental overwrites

## What to monitor going forward
- Every new API route added must have server-side auth + role middleware applied
- Gmail webhook handler will need signature validation when implemented
- Claude prompt construction must not embed unsanitized email content directly
