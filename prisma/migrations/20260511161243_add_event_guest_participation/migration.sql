-- CreateEnum
CREATE TYPE "EventInvitationStatus" AS ENUM ('not_invited', 'invited');

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('unknown', 'confirmed', 'declined', 'maybe');

-- CreateTable
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "invitationStatus" "EventInvitationStatus" NOT NULL DEFAULT 'invited',
    "rsvpStatus" "EventRsvpStatus" NOT NULL DEFAULT 'confirmed',
    "requiresSeat" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventGuest_eventId_idx" ON "EventGuest"("eventId");

-- CreateIndex
CREATE INDEX "EventGuest_guestId_idx" ON "EventGuest"("guestId");

-- CreateIndex
CREATE INDEX "EventGuest_requiresSeat_idx" ON "EventGuest"("requiresSeat");

-- CreateIndex
CREATE INDEX "EventGuest_rsvpStatus_idx" ON "EventGuest"("rsvpStatus");

-- CreateIndex
CREATE UNIQUE INDEX "EventGuest_eventId_guestId_key" ON "EventGuest"("eventId", "guestId");

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
