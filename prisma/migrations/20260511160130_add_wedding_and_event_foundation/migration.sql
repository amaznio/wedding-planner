-- CreateEnum
CREATE TYPE "WeddingEventType" AS ENUM ('wedding', 'afterparty', 'bachelor', 'bachelorette', 'other');

-- AlterTable
ALTER TABLE "SeatingPlan" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "timezone" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingEvent" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WeddingEventType" NOT NULL DEFAULT 'wedding',
    "startsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingEvent_weddingId_idx" ON "WeddingEvent"("weddingId");

-- CreateIndex
CREATE INDEX "SeatingPlan_eventId_idx" ON "SeatingPlan"("eventId");

-- AddForeignKey
ALTER TABLE "WeddingEvent" ADD CONSTRAINT "WeddingEvent_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingPlan" ADD CONSTRAINT "SeatingPlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
