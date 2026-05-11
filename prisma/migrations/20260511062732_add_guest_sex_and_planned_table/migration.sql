-- CreateEnum
CREATE TYPE "GuestSex" AS ENUM ('male', 'female', 'unknown');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "plannedTableId" TEXT,
ADD COLUMN     "sex" "GuestSex" NOT NULL DEFAULT 'unknown';

-- CreateIndex
CREATE INDEX "Guest_plannedTableId_idx" ON "Guest"("plannedTableId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_plannedTableId_fkey" FOREIGN KEY ("plannedTableId") REFERENCES "SeatingTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
