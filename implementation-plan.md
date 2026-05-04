# Implementation Plan

## Phase 1 — Project Setup & Infrastructure

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up Node.js + Express + TypeScript project in `/server`
- [ ] Set up React + TypeScript + Vite project in `/client`
- [ ] Configure Tailwind CSS and React Router in `/client`
- [ ] Set up ESLint + Prettier for both client and server
- [ ] Set up PostgreSQL locally with Docker Compose
- [ ] Initialize Prisma and connect to PostgreSQL
- [ ] Configure environment variables (`.env.example`)
- [ ] Set up Dockerfile for client and server
- [ ] Set up `docker-compose.yml` for local development (app + db)

---

## Phase 2 — Database Schema & Auth

- [ ] Design and create Prisma schema:
  - `User` (id, name, email, password, role: admin | agent)
  - `Ticket` (id, subject, status, clientEmail, createdAt, updatedAt)
  - `Message` (id, ticketId, body, sender, direction: inbound | outbound, createdAt)
  - `Task` (id, ticketId, type: approval | action, status, assignedTo, createdAt)
  - `KnowledgeBaseEntry` (id, question, answer, status: active | pending, createdAt)
  - `Session` (id, userId, expiresAt)
- [ ] Run initial Prisma migration
- [ ] Implement session-based authentication:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/me`
- [ ] Implement auth middleware (protect routes by role)
- [ ] Create seed script with admin and agent users

---

## Phase 3 — Email Integration (Gmail API)

- [ ] Set up Google Cloud project and enable Gmail API
- [ ] Implement Google OAuth 2.0 flow to authorize the inbox
- [ ] Store and refresh OAuth tokens securely
- [ ] Implement Gmail Pub/Sub push notification webhook (`POST /webhooks/gmail`)
- [ ] Implement email reader: fetch full message from Gmail by message ID
- [ ] Implement email sender: reply from the same inbox via Gmail API
- [ ] Parse inbound email: extract sender, subject, body, thread ID
- [ ] Map inbound email to an existing ticket (by thread ID) or create a new one

---

## Phase 4 — Ticket System (Core)

- [ ] `GET /tickets` — list tickets with filtering (status, assignee) and sorting
- [ ] `GET /tickets/:id` — ticket details with full message history
- [ ] `PATCH /tickets/:id` — update ticket status (open, closed, pending)
- [ ] Auto-reopen closed ticket when a client reply arrives on the same thread
- [ ] Maintain full conversation history on reopen

---

## Phase 5 — AI Layer (Claude API)

- [ ] Set up Claude API client with API key
- [ ] Implement email classifier: categorize the ticket topic using the knowledge base
- [ ] Implement response generator: produce a personal, human-friendly reply based on FAQ
- [ ] Implement confidence scoring: determine if the AI is confident in its response
- [ ] Implement AI summary: summarize long or reopened conversation threads
- [ ] Implement suggested reply: propose a draft for the agent to edit and send
- [ ] Implement agent helper: polish/improve an agent-written draft

---

## Phase 6 — Auto-send & Task Creation Logic

- [ ] If AI confidence is high: auto-send response via Gmail API and close/update ticket
- [ ] If AI confidence is low: create an approval task and notify agents
- [ ] If response requires an action (e.g. refund): create an action task + send acknowledgement email to client
- [ ] `GET /tasks` — list pending tasks for agents
- [ ] `GET /tasks/:id` — task detail with ticket context
- [ ] `POST /tasks/:id/approve` — agent approves and sends the AI response
- [ ] `POST /tasks/:id/reject` — agent rejects and edits before sending
- [ ] `POST /tasks/:id/complete` — agent marks action task as done

---

## Phase 7 — Knowledge Base

- [ ] `GET /knowledge-base` — list all active entries
- [ ] `POST /knowledge-base` — admin creates a new entry
- [ ] `PUT /knowledge-base/:id` — admin edits an entry
- [ ] `DELETE /knowledge-base/:id` — admin removes an entry
- [ ] `POST /knowledge-base/suggestions` — agent submits a suggested update
- [ ] `GET /knowledge-base/suggestions` — admin lists pending suggestions
- [ ] `POST /knowledge-base/suggestions/:id/approve` — admin approves and publishes
- [ ] `POST /knowledge-base/suggestions/:id/reject` — admin rejects suggestion

---

## Phase 8 — Front-end: Core UI

- [ ] Set up React Router routes and layout shell (sidebar + header)
- [ ] Build login page and connect to auth API
- [ ] Build ticket list page with filtering and sorting
- [ ] Build ticket detail page with conversation thread
- [ ] Build task list page for agents
- [ ] Build task detail page with approve / reject / complete actions
- [ ] Build knowledge base list page
- [ ] Build knowledge base entry form (create / edit)
- [ ] Build suggestion submission form for agents
- [ ] Build suggestion approval queue for admins

---

## Phase 9 — Front-end: Admin Pages

- [ ] Build user management page (list, create, edit, deactivate users)
- [ ] Build tickets manager (assign, escalate, force-close tickets)
- [ ] Build dashboard: open tickets count, pending tasks, recent activity

---

## Phase 10 — Front-end: AI Features UI

- [ ] Display AI-generated summary on long/reopened ticket threads
- [ ] Display AI suggested reply in ticket detail (editable before sending)
- [ ] Add "Polish with AI" button on the agent reply composer
- [ ] Show AI confidence indicator on auto-sent responses

---

## Phase 11 — Testing

- [ ] Unit tests for AI classification and confidence logic
- [ ] Unit tests for auth middleware and role checks
- [ ] Integration tests for Gmail webhook → ticket creation flow
- [ ] Integration tests for auto-send and task creation logic
- [ ] Integration tests for knowledge base approval flow
- [ ] Basic E2E tests for login, ticket view, task approval

---

## Phase 12 — Deployment

- [ ] Finalize Dockerfiles for production (client + server)
- [ ] Configure environment variables for production
- [ ] Choose and provision cloud provider (AWS / Railway / Fly.io)
- [ ] Set up PostgreSQL managed instance in production
- [ ] Deploy and configure Gmail Pub/Sub webhook for production URL
- [ ] Set up basic logging and error monitoring
- [ ] Smoke test all critical flows in production
