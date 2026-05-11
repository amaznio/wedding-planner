-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "weddingId" TEXT;

-- CreateIndex
CREATE INDEX "Guest_weddingId_idx" ON "Guest"("weddingId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
