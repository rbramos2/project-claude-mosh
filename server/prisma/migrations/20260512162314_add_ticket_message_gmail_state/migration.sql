-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'closed', 'pending');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "clientEmail" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailSyncState" (
    "id" SERIAL NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_gmailThreadId_key" ON "Ticket"("gmailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_gmailMessageId_key" ON "Message"("gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailSyncState_emailAddress_key" ON "GmailSyncState"("emailAddress");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
