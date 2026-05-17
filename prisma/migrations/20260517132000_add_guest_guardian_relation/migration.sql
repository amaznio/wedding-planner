ALTER TABLE "Guest"
ADD COLUMN "guardianGuestId" TEXT;

ALTER TABLE "Guest"
ADD CONSTRAINT "Guest_guardianGuestId_fkey"
FOREIGN KEY ("guardianGuestId") REFERENCES "Guest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Guest_guardianGuestId_idx" ON "Guest"("guardianGuestId");
