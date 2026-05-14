-- CreateEnum
CREATE TYPE "WeddingMemberRole" AS ENUM ('owner', 'editor', 'viewer');

-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN "ownerId" TEXT;

-- CreateTable
CREATE TABLE "WeddingMembership" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WeddingMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Wedding_ownerId_idx" ON "Wedding"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingMembership_weddingId_userId_key" ON "WeddingMembership"("weddingId", "userId");

-- CreateIndex
CREATE INDEX "WeddingMembership_weddingId_idx" ON "WeddingMembership"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingMembership_userId_idx" ON "WeddingMembership"("userId");

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingMembership" ADD CONSTRAINT "WeddingMembership_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingMembership" ADD CONSTRAINT "WeddingMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
