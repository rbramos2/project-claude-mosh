import "dotenv/config";
import prisma from "./lib/prisma";

const tickets = [
  {
    id: "ticket_01",
    subject: "Cannot log into my account",
    status: "open" as const,
    clientEmail: "alice.johnson@example.com",
    gmailThreadId: "thread_demo_01",
    messages: [
      {
        body: "Hi, I've been trying to log into my account for the past hour but keep getting an 'Invalid credentials' error. I'm sure my password is correct. Can you help?",
        sender: "alice.johnson@example.com",
        direction: "inbound" as const,
        gmailMessageId: "msg_demo_01a",
      },
    ],
  },
  {
    id: "ticket_02",
    subject: "Request for refund on order #8821",
    status: "pending" as const,
    clientEmail: "bob.smith@acme.com",
    gmailThreadId: "thread_demo_02",
    messages: [
      {
        body: "Hello, I'd like to request a refund for order #8821. The product arrived damaged and doesn't match the description. I have photos if needed. Please advise on the next steps.",
        sender: "bob.smith@acme.com",
        direction: "inbound" as const,
        gmailMessageId: "msg_demo_02a",
      },
      {
        body: "Hi Bob, sorry to hear about the damaged product! We've started processing your refund. Could you send us the photos for our records? You'll receive the refund within 3–5 business days.",
        sender: "support@helpdesk.com",
        direction: "outbound" as const,
        gmailMessageId: "msg_demo_02b",
      },
    ],
  },
  {
    id: "ticket_03",
    subject: "How do I export my data?",
    status: "closed" as const,
    clientEmail: "carol.white@startup.io",
    gmailThreadId: "thread_demo_03",
    messages: [
      {
        body: "Hi! Is there a way to export all my data from the platform? I need it in CSV format for a report. Thanks",
        sender: "carol.white@startup.io",
        direction: "inbound" as const,
        gmailMessageId: "msg_demo_03a",
      },
      {
        body: "Hi Carol! Yes — go to Settings → Data → Export and select CSV. The download will be ready in a few minutes. Let us know if you run into any issues!",
        sender: "support@helpdesk.com",
        direction: "outbound" as const,
        gmailMessageId: "msg_demo_03b",
      },
    ],
  },
  {
    id: "ticket_04",
    subject: "Billing charge I don't recognize",
    status: "open" as const,
    clientEmail: "david.lee@gmail.com",
    gmailThreadId: "thread_demo_04",
    messages: [
      {
        body: "I noticed a $49.99 charge on my credit card from your company on May 10th. I don't remember authorizing this. Can you explain what it's for and issue a refund if it was a mistake?",
        sender: "david.lee@gmail.com",
        direction: "inbound" as const,
        gmailMessageId: "msg_demo_04a",
      },
    ],
  },
  {
    id: "ticket_05",
    subject: "Integration with Slack not working",
    status: "open" as const,
    clientEmail: "emma.davis@techcorp.com",
    gmailThreadId: "thread_demo_05",
    messages: [
      {
        body: "We set up the Slack integration last week but notifications stopped coming through yesterday. Our workspace is still connected according to the settings page. Is there a known issue?",
        sender: "emma.davis@techcorp.com",
        direction: "inbound" as const,
        gmailMessageId: "msg_demo_05a",
      },
    ],
  },
];

for (const { messages, ...ticket } of tickets) {
  await prisma.ticket.upsert({
    where: { gmailThreadId: ticket.gmailThreadId },
    create: {
      ...ticket,
      messages: { create: messages.map((m) => ({ ...m, id: `${m.gmailMessageId}_rec` })) },
    },
    update: {},
  });
}

console.log(`Seeded ${tickets.length} example tickets.`);
await prisma.$disconnect();
