-- CreateTable
CREATE TABLE "WeddingNote" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeddingNote_weddingId_idx" ON "WeddingNote"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingNote_weddingId_pinned_idx" ON "WeddingNote"("weddingId", "pinned");

-- AddForeignKey
ALTER TABLE "WeddingNote" ADD CONSTRAINT "WeddingNote_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
