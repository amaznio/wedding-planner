-- CreateTable
CREATE TABLE "WeddingDocument" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT,
    "vendorId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ownerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "externalUrl" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingDocument_weddingId_idx" ON "WeddingDocument"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingDocument_eventId_idx" ON "WeddingDocument"("eventId");

-- CreateIndex
CREATE INDEX "WeddingDocument_vendorId_idx" ON "WeddingDocument"("vendorId");

-- CreateIndex
CREATE INDEX "WeddingDocument_status_idx" ON "WeddingDocument"("status");

-- AddForeignKey
ALTER TABLE "WeddingDocument" ADD CONSTRAINT "WeddingDocument_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingDocument" ADD CONSTRAINT "WeddingDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingDocument" ADD CONSTRAINT "WeddingDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
