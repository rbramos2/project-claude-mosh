---
name: Project Test Infrastructure
description: Layout of the e2e directory, Playwright config decisions, global setup, and fixture patterns established
type: project
---

## Test directory: `e2e/` at project root

- `playwright.config.ts` — root of project, baseURL `http://localhost:5173`, 1 worker, fullyParallel: false
- `e2e/global-setup.ts` — runs `prisma migrate deploy` + `seed.ts` + `seed-agent.ts` against `helpdesk_test` DB before all tests
- `e2e/fixtures/auth.ts` — exports `test` (extended with `adminPage`/`agentPage` fixtures), `loginAs()` helper, credential constants
- Test DB: `postgresql://raphaelmilanramos@localhost:5432/helpdesk_test`
- Run command: `bun run test:e2e`

## Credential constants (in fixtures/auth.ts)
- Admin: `admin@example.com` / `password123` / name `"Admin"`
- Agent: `agent@example.com` / `password123` / name `"Agent"`

## Fixture pattern
- `adminPage` / `agentPage` — isolated `browser.newContext()` per fixture, logs in via `loginAs()`, closes context on teardown
- Tests using role fixtures import `test` from `./fixtures/auth`
- Tests not needing pre-auth import `test as base` from `@playwright/test`

## Import convention in spec files
```ts
import { test as base, expect } from "@playwright/test";   // unauthenticated tests
import { test, loginAs, ... } from "./fixtures/auth";       // role-based tests
```

**Why:** Keeping both allows `test.describe` (with fixtures) and `base.describe` (plain page) in the same file without confusion.
**How to apply:** Follow this two-import pattern in all future spec files.
