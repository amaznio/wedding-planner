-- Backfill EventGuest from existing Guest.planId -> SeatingPlan.eventId
INSERT INTO "EventGuest" (
  "id",
  "eventId",
  "guestId",
  "invitationStatus",
  "rsvpStatus",
  "requiresSeat",
  "createdAt",
  "updatedAt"
)
SELECT
  'evg_' || SUBSTRING(MD5(g.id || ':' || sp."eventId") FROM 1 FOR 24),
  sp."eventId",
  g.id,
  'invited'::"EventInvitationStatus",
  'confirmed'::"EventRsvpStatus",
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Guest" g
JOIN "SeatingPlan" sp ON sp.id = g."planId"
WHERE sp."eventId" IS NOT NULL
ON CONFLICT ("eventId", "guestId") DO NOTHING;
