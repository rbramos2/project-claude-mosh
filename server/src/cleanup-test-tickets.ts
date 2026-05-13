import "dotenv/config";
import prisma from "./lib/prisma";

// Remove all tickets (and their messages via cascade) created during E2E tests.
// This runs before each Playwright suite so the happy-path webhook test always
// starts with a clean slate.
await prisma.message.deleteMany({});
await prisma.ticket.deleteMany({});

console.log("Test tickets and messages cleaned up");
await prisma.$disconnect();
