## Problem

We receive a lot of e-mails with different questions, which spend time to classify and answer, and people don't like standard responses.

## Solution

Create a software that reads e-mails, classifies the problem using AI, and responds automatically in a personal, human-friendly way.

## Decisions & Constraints

**Email Integration**
- Provider: Gmail
- Replies are sent automatically from the same inbox

**AI Behavior**
- If AI is confident: sends the response automatically
- If AI is not confident: creates a task for an agent to review and approve before sending
- If the response requires an action (e.g. refund): creates a task for the agent and informs the client that the process is in progress

**Knowledge Base**
- Format: FAQ document
- Admins can update it directly
- Agents can suggest updates, which require admin approval before taking effect

**Tickets & Conversations**
- If a client replies to a closed ticket, it reopens and maintains the full history
- AI summaries apply to reopened/long conversation threads as well

**Team & Access**
- ~5 support agents
- Any agent can pick up any ticket
- Admin role: ticket manager + user manager + knowledge base management
- Agent role: view tickets, handle tasks, suggest KB updates

**Data & Compliance**
- No specific data residency or compliance requirements (GDPR, HIPAA, etc.)
- Tickets and email content retained indefinitely

**Scope**
- Internal tooling (not multi-tenant SaaS)

## Features

- Receive support emails via Gmail and create tickets
- Generate personal, human-friendly responses using a knowledge base (FAQ)
- Auto-send responses when AI confidence is high
- Task creation for agent approval when AI confidence is low
- Task creation for actions that require human execution (e.g. refunds), with automatic client acknowledgement
- Client reply handling: reopen ticket and maintain conversation history
- Ticket list with filtering and sorting
- Ticket details view with full conversation history
- AI ticket classifier
- AI summaries for long and reopened conversations
- AI suggested replies
- Agent helper to polish answers
- Knowledge base management (admin edit, agent suggestion with approval flow)
- Tickets manager and user manager (admin only)
- Dashboard to view and manage tickets
