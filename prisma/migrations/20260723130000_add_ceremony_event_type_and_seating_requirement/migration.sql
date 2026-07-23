ALTER TYPE "WeddingEventType" ADD VALUE IF NOT EXISTS 'ceremony';

ALTER TABLE "WeddingEvent"
ADD COLUMN "requiresSeatingPlan" BOOLEAN NOT NULL DEFAULT true;
