import "dotenv/config";
import prisma from "./lib/prisma";

// Seeded for the Playwright E2E webhook tests.
// The email address matches the one used in webhook-gmail.spec.ts happy-path tests.
const MOCK_EMAIL = "support@helpdesk.com";
const INITIAL_HISTORY_ID = "1000";

await prisma.gmailSyncState.upsert({
  where: { emailAddress: MOCK_EMAIL },
  update: { historyId: INITIAL_HISTORY_ID },
  create: {
    emailAddress: MOCK_EMAIL,
    historyId: INITIAL_HISTORY_ID,
    accessToken: "mock-access-token",
  },
});

console.log(`GmailSyncState seeded for: ${MOCK_EMAIL}`);
await prisma.$disconnect();
