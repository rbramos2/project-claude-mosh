-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('agent', 'customer');

-- AlterTable: add with default, backfill from direction, then set NOT NULL
ALTER TABLE "Message" ADD COLUMN "senderType" "SenderType";

UPDATE "Message" SET "senderType" = CASE
  WHEN direction = 'inbound' THEN 'customer'::"SenderType"
  ELSE 'agent'::"SenderType"
END;

ALTER TABLE "Message" ALTER COLUMN "senderType" SET NOT NULL;
