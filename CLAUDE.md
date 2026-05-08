# Project Instructions

## Project Overview

An internal AI-powered email support tool. It reads Gmail inboxes, classifies support emails using Claude AI, and responds automatically in a human-friendly way. When AI confidence is high, replies are auto-sent; when low, a task is created for agent review. Actions requiring human execution (e.g. refunds) also generate tasks with automatic client acknowledgement.

**Roles:** Admin (full access + user/KB management) and Agent (tickets + tasks + KB suggestions).

## Tech Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, React Router
- **Backend:** Node.js + Express + TypeScript, session-based auth
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Claude API (Anthropic) — classification, response generation, confidence scoring, summaries
- **Email:** Gmail API with Google OAuth 2.0 + Pub/Sub push notifications

## Implementation Phases (see `implementation-plan.md`)

1. Project setup & monorepo (`/client`, `/server`)
2. DB schema (Prisma) + session auth
3. Gmail API integration + webhook
4. Ticket system CRUD + reopen logic
5. Claude AI layer (classify, respond, score, summarize)
6. Auto-send & task creation logic
7. Knowledge base (admin CRUD + agent suggestion/approval flow)
8. Frontend core UI (tickets, tasks, KB pages)
9. Frontend admin pages (user mgmt, dashboard)
10. Frontend AI features (summaries, suggested replies, polish button)
11. Testing (unit, integration, E2E)
12. Docker + cloud deployment

> Full details: `project-scope.md`, `tech-stack.md`, `implementation-plan.md`

## Authentication

**Library:** Better Auth with Prisma adapter (PostgreSQL)

**Key decisions:**
- Sign-up is disabled — users are provisioned by an admin (seed script or future admin UI)
- `User` model extended with `role: "admin" | "agent"` (default `"agent"`, not user-settable on input)

**Server** (`server/src/lib/auth.ts`):
- Exports `auth` instance and `Session` type
- Handler mounted at `/api/auth/*` via `toNodeHandler(auth)` in `server/src/app.ts`
- Trusted origins loaded from `TRUSTED_ORIGINS` env var (comma-separated)
- CORS allows `localhost:5173` and `localhost:5174` with credentials

**Client** (`client/src/lib/auth-client.ts`):
- Exports `authClient`, `signIn`, `signOut`, `useSession`
- Login form uses `react-hook-form` + Zod + `signIn.email()`

**Seed:** `server/src/seed.ts` — creates the initial admin user

---

## Documentation Lookup with Context7

Use Context7 MCP to fetch current documentation whenever questions arise about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. If not satisfied with the answer, call `query-docs` again for the same library with `researchMode: true`. This retries with sandboxed agents that git-pull the actual source repos plus a live web search, then synthesizes a fresh answer. More costly than the default
5. Answer using the fetched docs
