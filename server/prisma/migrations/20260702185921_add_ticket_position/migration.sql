-- DropIndex
DROP INDEX "Ticket_status_idx";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: rank existing tickets by creation date (newest first), matching
-- the order the board displayed before positions existed.
UPDATE "Ticket" t
SET "position" = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC, id DESC) AS rn
  FROM "Ticket"
) ranked
WHERE t.id = ranked.id;

-- CreateIndex
CREATE INDEX "Ticket_status_position_idx" ON "Ticket"("status", "position");
