-- Add wedding dashboard cover image metadata
ALTER TABLE "Wedding"
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "coverImagePublicId" TEXT,
ADD COLUMN "coverImageWidth" INTEGER,
ADD COLUMN "coverImageHeight" INTEGER,
ADD COLUMN "coverImageUploadedAt" TIMESTAMP(3);
