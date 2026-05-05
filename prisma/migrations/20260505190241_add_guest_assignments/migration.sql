-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatAssignment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guest_planId_idx" ON "Guest"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAssignment_guestId_key" ON "SeatAssignment"("guestId");

-- CreateIndex
CREATE INDEX "SeatAssignment_planId_idx" ON "SeatAssignment"("planId");

-- CreateIndex
CREATE INDEX "SeatAssignment_tableId_idx" ON "SeatAssignment"("tableId");

-- CreateIndex
CREATE INDEX "SeatAssignment_guestId_idx" ON "SeatAssignment"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatAssignment_planId_tableId_seatNumber_key" ON "SeatAssignment"("planId", "tableId", "seatNumber");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SeatingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "SeatingTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
