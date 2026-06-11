import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingTaskSchema } from "@/features/wedding/schemas/wedding.schema";
import {
  applyTaskStatusToChecklist,
  TaskStatusConflictError,
  validateTaskLinks,
  weddingTaskInclude,
} from "@/features/wedding-tasks/lib/task-server";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; taskId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, taskId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = updateWeddingTaskSchema.parse(await request.json());
    const existing = await prisma.weddingTask.findFirst({
      where: { id: taskId, weddingId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const linkError = await validateTaskLinks(weddingId, payload);
    if (linkError) return linkError;

    const task = await prisma.$transaction(async (transaction) => {
      if (payload.status) {
        await applyTaskStatusToChecklist(transaction, taskId, payload.status);
      }

      return transaction.weddingTask.update({
        where: { id: taskId },
        data: {
          title: payload.title,
          dueDate: payload.dueDate,
          priority: payload.priority,
          status: payload.status,
          eventId: payload.eventId,
          groupId: payload.groupId,
          assigneeMembershipId: payload.assigneeMembershipId,
        },
        include: weddingTaskInclude,
      });
    });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof TaskStatusConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, taskId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingTask.findFirst({
    where: { id: taskId, weddingId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.weddingTask.delete({ where: { id: taskId } });
  return NextResponse.json({ success: true });
}
