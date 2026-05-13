import "dotenv/config";
import * as readline from "readline";
import { buildOAuth2Client, watchInbox } from "../lib/gmail";
import prisma from "../lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const auth = buildOAuth2Client();

  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\nOpen this URL in your browser to authorize the support inbox:\n");
  console.log(authUrl);
  console.log();

  const code = await prompt("Paste the authorization code here: ");
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);

  if (!tokens.refresh_token) {
    console.error("\nNo refresh token received. Make sure you authorized with prompt=consent and a fresh account.");
    process.exit(1);
  }

  console.log("\nSave this refresh token in your .env as GMAIL_REFRESH_TOKEN:");
  console.log(tokens.refresh_token);
  console.log();

  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    console.error("GMAIL_PUBSUB_TOPIC is not set in .env");
    process.exit(1);
  }

  const { historyId, expiration } = await watchInbox(auth, "me", topic);
  console.log(`Pub/Sub watch registered. historyId=${historyId}, expires=${new Date(Number(expiration))}`);

  const gmail = await import("googleapis").then((m) => m.google.gmail({ version: "v1", auth }));
  const profile = await gmail.users.getProfile({ userId: "me" });
  const emailAddress = profile.data.emailAddress!;

  await prisma.gmailSyncState.upsert({
    where: { emailAddress },
    create: { emailAddress, historyId, accessToken: tokens.access_token! },
    update: { historyId, accessToken: tokens.access_token! },
  });

  console.log(`\nGmailSyncState saved for ${emailAddress}`);
  console.log("Setup complete. The webhook is ready to receive Gmail push notifications.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
