-- AlterTable
ALTER TABLE "Vendor"
ADD COLUMN "vendorType" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN "venuePricePerPersonMinor" INTEGER,
ADD COLUMN "venueGuestCount" INTEGER,
ADD COLUMN "venuePricingEventId" TEXT;

-- CreateIndex
CREATE INDEX "Vendor_vendorType_idx" ON "Vendor"("vendorType");

-- CreateIndex
CREATE INDEX "Vendor_venuePricingEventId_idx" ON "Vendor"("venuePricingEventId");
