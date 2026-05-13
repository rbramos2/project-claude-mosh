import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import prisma from "./prisma";

export function buildOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

export async function getAuthClient(emailAddress: string): Promise<OAuth2Client> {
  const state = await prisma.gmailSyncState.findUniqueOrThrow({
    where: { emailAddress },
  });

  const auth = buildOAuth2Client();
  auth.setCredentials({
    access_token: state.accessToken,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  auth.on("tokens", async (tokens: { access_token?: string | null }) => {
    if (tokens.access_token) {
      await prisma.gmailSyncState.update({
        where: { emailAddress },
        data: { accessToken: tokens.access_token },
      });
    }
  });

  return auth;
}

export async function watchInbox(
  auth: OAuth2Client,
  userId: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.watch({
    userId,
    requestBody: {
      topicName,
      labelIds: ["INBOX"],
    },
  });
  return {
    historyId: res.data.historyId!,
    expiration: res.data.expiration!,
  };
}

export async function fetchNewMessages(
  auth: OAuth2Client,
  userId: string,
  startHistoryId: string
): Promise<{ messages: Array<{ id: string; threadId: string }>; newHistoryId: string }> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.history.list({
    userId,
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const history = res.data.history ?? [];
  const messages: Array<{ id: string; threadId: string }> = [];

  for (const entry of history) {
    for (const added of entry.messagesAdded ?? []) {
      if (added.message?.id && added.message?.threadId) {
        messages.push({ id: added.message.id, threadId: added.message.threadId });
      }
    }
  }

  return {
    messages,
    newHistoryId: res.data.historyId ?? startHistoryId,
  };
}

export async function fetchMessage(auth: OAuth2Client, userId: string, messageId: string) {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId,
    id: messageId,
    format: "full",
  });
  return res.data;
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractBody(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

export function parseEmail(message: any): {
  subject: string;
  from: string;
  body: string;
  threadId: string;
  messageId: string;
} {
  const headers: Array<{ name?: string | null; value?: string | null }> = message.payload?.headers ?? [];
  return {
    subject: getHeader(headers, "subject"),
    from: getHeader(headers, "from"),
    body: extractBody(message.payload),
    threadId: message.threadId,
    messageId: message.id,
  };
}

// ---------------------------------------------------------------------------
// Test doubles — only used when GMAIL_MOCK=true (test environment)
// ---------------------------------------------------------------------------

export const mockGetAuthClient = async (_emailAddress: string): Promise<OAuth2Client> => {
  return buildOAuth2Client();
};

export const mockFetchNewMessages = async (
  _auth: OAuth2Client,
  _userId: string,
  startHistoryId: string
): Promise<{ messages: Array<{ id: string; threadId: string }>; newHistoryId: string }> => ({
  messages: [{ id: "mock_msg_001", threadId: "mock_thread_001" }],
  newHistoryId: String(Number(startHistoryId) + 1),
});

export const mockFetchMessage = async (
  _auth: OAuth2Client,
  _userId: string,
  _messageId: string
): Promise<any> => ({
  id: "mock_msg_001",
  threadId: "mock_thread_001",
  payload: {
    headers: [
      { name: "Subject", value: "Test support email" },
      { name: "From", value: "customer@example.com" },
    ],
    mimeType: "text/plain",
    body: { data: Buffer.from("Hello, I need help!").toString("base64") },
  },
});
