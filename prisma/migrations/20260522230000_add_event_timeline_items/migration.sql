-- CreateTable
CREATE TABLE "EventTimelineItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTimelineItem_eventId_idx" ON "EventTimelineItem"("eventId");

-- CreateIndex
CREATE INDEX "EventTimelineItem_eventId_sortOrder_idx" ON "EventTimelineItem"("eventId", "sortOrder");

-- AddForeignKey
ALTER TABLE "EventTimelineItem" ADD CONSTRAINT "EventTimelineItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
