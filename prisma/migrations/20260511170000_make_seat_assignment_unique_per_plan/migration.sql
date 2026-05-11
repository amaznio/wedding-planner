-- Switch seat assignment guest uniqueness from global guestId to per-plan planId+guestId
DROP INDEX IF EXISTS "SeatAssignment_guestId_key";
CREATE UNIQUE INDEX "SeatAssignment_planId_guestId_key" ON "SeatAssignment"("planId", "guestId");
