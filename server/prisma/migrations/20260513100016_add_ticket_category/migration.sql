-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('billing', 'technical', 'account', 'feature_request', 'general');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "category" "TicketCategory" NOT NULL DEFAULT 'general';
