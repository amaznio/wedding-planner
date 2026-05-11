-- CreateEnum
CREATE TYPE "HouseholdMemberRole" AS ENUM ('adult', 'child');

-- CreateEnum
CREATE TYPE "VendorPaymentStatus" AS ENUM ('not_started', 'partial', 'paid', 'canceled');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('planned', 'committed', 'paid', 'reimbursed', 'canceled');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "role" "HouseholdMemberRole" NOT NULL DEFAULT 'adult',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingGuestGroup" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingGuestGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingGuestGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingGuestGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "totalCostMinor" INTEGER NOT NULL DEFAULT 0,
    "depositMinor" INTEGER NOT NULL DEFAULT 0,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "VendorPaymentStatus" NOT NULL DEFAULT 'not_started',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorEvent" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidBy" TEXT,
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Household_weddingId_idx" ON "Household"("weddingId");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdMember_guestId_idx" ON "HouseholdMember"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_guestId_key" ON "HouseholdMember"("householdId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_guestId_key" ON "HouseholdMember"("guestId");

-- CreateIndex
CREATE INDEX "WeddingGuestGroup_weddingId_idx" ON "WeddingGuestGroup"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingGuestGroup_weddingId_nameNormalized_key" ON "WeddingGuestGroup"("weddingId", "nameNormalized");

-- CreateIndex
CREATE INDEX "WeddingGuestGroupMember_groupId_idx" ON "WeddingGuestGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "WeddingGuestGroupMember_guestId_idx" ON "WeddingGuestGroupMember"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingGuestGroupMember_groupId_guestId_key" ON "WeddingGuestGroupMember"("groupId", "guestId");

-- CreateIndex
CREATE INDEX "Vendor_weddingId_idx" ON "Vendor"("weddingId");

-- CreateIndex
CREATE INDEX "VendorEvent_vendorId_idx" ON "VendorEvent"("vendorId");

-- CreateIndex
CREATE INDEX "VendorEvent_eventId_idx" ON "VendorEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorEvent_vendorId_eventId_key" ON "VendorEvent"("vendorId", "eventId");

-- CreateIndex
CREATE INDEX "Expense_weddingId_idx" ON "Expense"("weddingId");

-- CreateIndex
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");

-- CreateIndex
CREATE INDEX "Expense_vendorId_idx" ON "Expense"("vendorId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingGuestGroup" ADD CONSTRAINT "WeddingGuestGroup_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingGuestGroupMember" ADD CONSTRAINT "WeddingGuestGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WeddingGuestGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingGuestGroupMember" ADD CONSTRAINT "WeddingGuestGroupMember_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvent" ADD CONSTRAINT "VendorEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorEvent" ADD CONSTRAINT "VendorEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
