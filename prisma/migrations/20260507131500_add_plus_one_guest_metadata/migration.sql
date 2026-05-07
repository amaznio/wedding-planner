-- Add explicit placeholder-plus-one metadata to guests.
ALTER TABLE "Guest"
ADD COLUMN "isPlaceholderPlusOne" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "plusOneHostGuestId" TEXT;

CREATE INDEX "Guest_plusOneHostGuestId_idx" ON "Guest"("plusOneHostGuestId");

ALTER TABLE "Guest"
ADD CONSTRAINT "Guest_plusOneHostGuestId_fkey"
FOREIGN KEY ("plusOneHostGuestId") REFERENCES "Guest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
