-- CreateEnum
CREATE TYPE "WeddingTaskStatus" AS ENUM ('todo', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "WeddingTaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "WeddingTaskGroup" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingTaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingTask" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "eventId" TEXT,
    "groupId" TEXT,
    "assigneeMembershipId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "priority" "WeddingTaskPriority" NOT NULL DEFAULT 'medium',
    "status" "WeddingTaskStatus" NOT NULL DEFAULT 'todo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingTaskChecklistItem" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingTaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeddingTaskGroup_weddingId_nameNormalized_key" ON "WeddingTaskGroup"("weddingId", "nameNormalized");

-- CreateIndex
CREATE INDEX "WeddingTaskGroup_weddingId_idx" ON "WeddingTaskGroup"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingTask_weddingId_idx" ON "WeddingTask"("weddingId");

-- CreateIndex
CREATE INDEX "WeddingTask_eventId_idx" ON "WeddingTask"("eventId");

-- CreateIndex
CREATE INDEX "WeddingTask_groupId_idx" ON "WeddingTask"("groupId");

-- CreateIndex
CREATE INDEX "WeddingTask_assigneeMembershipId_idx" ON "WeddingTask"("assigneeMembershipId");

-- CreateIndex
CREATE INDEX "WeddingTask_weddingId_status_idx" ON "WeddingTask"("weddingId", "status");

-- CreateIndex
CREATE INDEX "WeddingTask_weddingId_dueDate_idx" ON "WeddingTask"("weddingId", "dueDate");

-- CreateIndex
CREATE INDEX "WeddingTaskChecklistItem_taskId_idx" ON "WeddingTaskChecklistItem"("taskId");

-- CreateIndex
CREATE INDEX "WeddingTaskChecklistItem_taskId_sortOrder_idx" ON "WeddingTaskChecklistItem"("taskId", "sortOrder");

-- AddForeignKey
ALTER TABLE "WeddingTaskGroup" ADD CONSTRAINT "WeddingTaskGroup_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingTask" ADD CONSTRAINT "WeddingTask_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingTask" ADD CONSTRAINT "WeddingTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingTask" ADD CONSTRAINT "WeddingTask_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WeddingTaskGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingTask" ADD CONSTRAINT "WeddingTask_assigneeMembershipId_fkey" FOREIGN KEY ("assigneeMembershipId") REFERENCES "WeddingMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingTaskChecklistItem" ADD CONSTRAINT "WeddingTaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WeddingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
