-- CreateTable
CREATE TABLE "SeatingRelationship" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "preferredSeating" TEXT NOT NULL,
    "moveTogetherDefault" BOOLEAN NOT NULL DEFAULT false,
    "strict" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatingRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingRelationshipMember" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatingRelationshipMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatingRelationship_planId_idx" ON "SeatingRelationship"("planId");

-- CreateIndex
CREATE INDEX "SeatingRelationshipMember_relationshipId_idx" ON "SeatingRelationshipMember"("relationshipId");

-- CreateIndex
CREATE INDEX "SeatingRelationshipMember_guestId_idx" ON "SeatingRelationshipMember"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatingRelationshipMember_relationshipId_guestId_key" ON "SeatingRelationshipMember"("relationshipId", "guestId");

-- AddForeignKey
ALTER TABLE "SeatingRelationship" ADD CONSTRAINT "SeatingRelationship_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingRelationshipMember" ADD CONSTRAINT "SeatingRelationshipMember_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "SeatingRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatingRelationshipMember" ADD CONSTRAINT "SeatingRelationshipMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
