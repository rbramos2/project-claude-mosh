import { RequestHandler } from "express";
import prisma from "../../lib/prisma";
import {
  getAuthClient,
  fetchNewMessages,
  fetchMessage,
  parseEmail,
  mockGetAuthClient,
  mockFetchNewMessages,
  mockFetchMessage,
} from "../../lib/gmail";

const isMock = process.env.GMAIL_MOCK === "true";

const resolvedGetAuthClient = isMock ? mockGetAuthClient : getAuthClient;
const resolvedFetchNewMessages = isMock ? mockFetchNewMessages : fetchNewMessages;
const resolvedFetchMessage = isMock ? mockFetchMessage : fetchMessage;

export const gmailWebhook: RequestHandler = async (req, res) => {
  if (req.query.secret !== process.env.GMAIL_WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const data = req.body?.message?.data;
  if (!data) {
    res.status(400).json({ error: "Missing message data" });
    return;
  }

  let notification: { emailAddress: string; historyId: string };
  try {
    notification = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
  } catch {
    res.status(400).json({ error: "Invalid message data" });
    return;
  }

  const { emailAddress } = notification;

  const state = await prisma.gmailSyncState.findUnique({ where: { emailAddress } });
  if (!state) {
    res.status(204).end();
    return;
  }

  const auth = await resolvedGetAuthClient(emailAddress);
  const { messages, newHistoryId } = await resolvedFetchNewMessages(auth, emailAddress, state.historyId);

  for (const { id: messageId, threadId } of messages) {
    const existing = await prisma.message.findUnique({ where: { gmailMessageId: messageId } });
    if (existing) continue;

    const raw = await resolvedFetchMessage(auth, emailAddress, messageId);
    const { subject, from, body, threadId: parsedThreadId } = parseEmail(raw);

    if (from.includes(emailAddress)) continue;

    await prisma.ticket.upsert({
      where: { gmailThreadId: threadId },
      create: {
        subject: subject || "(no subject)",
        clientEmail: from,
        gmailThreadId: parsedThreadId,
        messages: {
          create: {
            body,
            sender: from,
            direction: "inbound",
            gmailMessageId: messageId,
          },
        },
      },
      update: {
        status: "open",
        updatedAt: new Date(),
        messages: {
          create: {
            body,
            sender: from,
            direction: "inbound",
            gmailMessageId: messageId,
          },
        },
      },
    });
  }

  await prisma.gmailSyncState.update({
    where: { emailAddress },
    data: { historyId: newHistoryId },
  });

  res.status(204).end();
};
