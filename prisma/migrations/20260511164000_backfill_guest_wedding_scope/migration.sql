-- Backfill Guest.weddingId from Guest.planId -> SeatingPlan.eventId -> WeddingEvent.weddingId
UPDATE "Guest" g
SET "weddingId" = we."weddingId"
FROM "SeatingPlan" sp
JOIN "WeddingEvent" we ON we.id = sp."eventId"
WHERE g."planId" = sp.id
  AND g."weddingId" IS NULL;
