-- Add per-plan public read sharing toggle
ALTER TABLE "SeatingPlan"
ADD COLUMN "isPublicRead" BOOLEAN NOT NULL DEFAULT false;
