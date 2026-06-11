-- CreateEnum
CREATE TYPE "VendorLifecycleStatus" AS ENUM ('considering', 'booked', 'contract_signed', 'canceled');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "lifecycleStatus" "VendorLifecycleStatus" NOT NULL DEFAULT 'considering';

-- Preserve existing cancellation state.
UPDATE "Vendor"
SET "lifecycleStatus" = 'canceled'
WHERE "paymentStatus" = 'canceled';
