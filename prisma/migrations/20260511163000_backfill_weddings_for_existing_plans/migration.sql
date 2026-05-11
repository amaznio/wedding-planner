-- Backfill one Wedding + one WeddingEvent for each SeatingPlan missing eventId
WITH plans_missing_event AS (
  SELECT id, name
  FROM "SeatingPlan"
  WHERE "eventId" IS NULL
),
insert_weddings AS (
  INSERT INTO "Wedding" (
    "id",
    "name",
    "currency",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'wdd_' || SUBSTRING(MD5(p.id) FROM 1 FOR 24),
    CASE
      WHEN NULLIF(BTRIM(p.name), '') IS NULL THEN 'Wedding'
      ELSE p.name || ' Wedding'
    END,
    'PLN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM plans_missing_event p
  ON CONFLICT ("id") DO NOTHING
),
insert_events AS (
  INSERT INTO "WeddingEvent" (
    "id",
    "weddingId",
    "name",
    "type",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'evt_' || SUBSTRING(MD5(p.id || ':wedding-day') FROM 1 FOR 24),
    'wdd_' || SUBSTRING(MD5(p.id) FROM 1 FOR 24),
    'Wedding Day',
    'wedding'::"WeddingEventType",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM plans_missing_event p
  ON CONFLICT ("id") DO NOTHING
)
UPDATE "SeatingPlan" sp
SET "eventId" = 'evt_' || SUBSTRING(MD5(sp.id || ':wedding-day') FROM 1 FOR 24)
WHERE sp."eventId" IS NULL;
