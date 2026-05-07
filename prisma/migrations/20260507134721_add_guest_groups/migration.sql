-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "groupId" TEXT;

-- CreateTable
CREATE TABLE "SeatingGuestGroup" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatingGuestGroup_pkey" PRIMARY KEY ("id")
);

-- Backfill groups from legacy Guest.group values
WITH raw_groups AS (
  SELECT
    "planId",
    BTRIM("group") AS "name",
    LOWER(BTRIM("group")) AS "nameNormalized",
    "createdAt",
    "id"
  FROM "Guest"
  WHERE "group" IS NOT NULL
    AND BTRIM("group") <> ''
),
deduped_groups AS (
  SELECT DISTINCT ON ("planId", "nameNormalized")
    "planId",
    "name",
    "nameNormalized",
    "createdAt",
    "id"
  FROM raw_groups
  ORDER BY "planId", "nameNormalized", "createdAt" ASC, "id" ASC
),
ordered_groups AS (
  SELECT
    "planId",
    "name",
    "nameNormalized",
    ROW_NUMBER() OVER (
      PARTITION BY "planId"
      ORDER BY "createdAt" ASC, "id" ASC, "nameNormalized" ASC
    ) - 1 AS "colorIndex"
  FROM deduped_groups
)
INSERT INTO "SeatingGuestGroup" (
  "id",
  "planId",
  "name",
  "nameNormalized",
  "color",
  "createdAt",
  "updatedAt"
)
SELECT
  'grp_' || SUBSTRING(MD5("planId" || ':' || "nameNormalized") FROM 1 FOR 24),
  "planId",
  "name",
  "nameNormalized",
  CASE ("colorIndex" % 12)
    WHEN 0 THEN '#2563EB'
    WHEN 1 THEN '#DC2626'
    WHEN 2 THEN '#16A34A'
    WHEN 3 THEN '#D97706'
    WHEN 4 THEN '#9333EA'
    WHEN 5 THEN '#0891B2'
    WHEN 6 THEN '#DB2777'
    WHEN 7 THEN '#4F46E5'
    WHEN 8 THEN '#65A30D'
    WHEN 9 THEN '#EA580C'
    WHEN 10 THEN '#0F766E'
    ELSE '#B91C1C'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM ordered_groups;

UPDATE "Guest" AS g
SET "groupId" = sg."id"
FROM "SeatingGuestGroup" AS sg
WHERE g."planId" = sg."planId"
  AND g."group" IS NOT NULL
  AND LOWER(BTRIM(g."group")) = sg."nameNormalized";

-- Drop legacy guest group text column
ALTER TABLE "Guest" DROP COLUMN "group";

-- CreateIndex
CREATE INDEX "SeatingGuestGroup_planId_idx" ON "SeatingGuestGroup"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatingGuestGroup_planId_nameNormalized_key" ON "SeatingGuestGroup"("planId", "nameNormalized");

-- CreateIndex
CREATE INDEX "Guest_groupId_idx" ON "Guest"("groupId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SeatingGuestGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingGuestGroup" ADD CONSTRAINT "SeatingGuestGroup_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
