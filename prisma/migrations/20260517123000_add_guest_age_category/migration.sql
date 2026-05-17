CREATE TYPE "GuestAgeCategory" AS ENUM ('adult', 'teen', 'child', 'small_child', 'toddler_0_2');

ALTER TABLE "Guest"
ADD COLUMN "ageCategory" "GuestAgeCategory" NOT NULL DEFAULT 'adult';

CREATE INDEX "Guest_ageCategory_idx" ON "Guest"("ageCategory");
