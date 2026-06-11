import type { Prisma, WeddingTaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { deriveTaskStatusFromChecklist } from "@/features/wedding-tasks/lib/task-rules";
import { prisma } from "@/lib/prisma";

export const weddingTaskInclude = {
  event: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  assigneeMembership: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
  checklistItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.WeddingTaskInclude;

export async function validateTaskLinks(
  weddingId: string,
  links: {
    eventId?: string | null;
    groupId?: string | null;
    assigneeMembershipId?: string | null;
  },
) {
  const [wedding, event, group, assignee] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } }),
    links.eventId
      ? prisma.weddingEvent.findFirst({ where: { id: links.eventId, weddingId }, select: { id: true } })
      : Promise.resolve(null),
    links.groupId
      ? prisma.weddingTaskGroup.findFirst({ where: { id: links.groupId, weddingId }, select: { id: true } })
      : Promise.resolve(null),
    links.assigneeMembershipId
      ? prisma.weddingMembership.findFirst({
          where: { id: links.assigneeMembershipId, weddingId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  if (links.eventId && !event) {
    return NextResponse.json({ error: "Event is invalid for this wedding" }, { status: 400 });
  }
  if (links.groupId && !group) {
    return NextResponse.json({ error: "Task group is invalid for this wedding" }, { status: 400 });
  }
  if (links.assigneeMembershipId && !assignee) {
    return NextResponse.json({ error: "Assignee is invalid for this wedding" }, { status: 400 });
  }
  return null;
}

export async function applyTaskStatusToChecklist(
  transaction: Prisma.TransactionClient,
  taskId: string,
  status: WeddingTaskStatus,
) {
  const itemCount = await transaction.weddingTaskChecklistItem.count({ where: { taskId } });
  if (!itemCount) return;

  if (status === "in_progress") {
    throw new TaskStatusConflictError("Tasks with checklist items cannot be set to in progress manually");
  }

  await transaction.weddingTaskChecklistItem.updateMany({
    where: { taskId },
    data: { completed: status === "done" },
  });
}

export async function syncTaskStatusFromChecklist(
  transaction: Prisma.TransactionClient,
  taskId: string,
) {
  const [total, completed] = await Promise.all([
    transaction.weddingTaskChecklistItem.count({ where: { taskId } }),
    transaction.weddingTaskChecklistItem.count({ where: { taskId, completed: true } }),
  ]);

  const status = deriveTaskStatusFromChecklist(total, completed);
  await transaction.weddingTask.update({ where: { id: taskId }, data: { status } });
}

export class TaskStatusConflictError extends Error {}
