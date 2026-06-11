import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingTaskChecklistItemSchema } from "@/features/wedding/schemas/wedding.schema";
import { syncTaskStatusFromChecklist, weddingTaskInclude } from "@/features/wedding-tasks/lib/task-server";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; taskId: string; itemId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, taskId, itemId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = updateWeddingTaskChecklistItemSchema.parse(await request.json());
    const existing = await prisma.weddingTaskChecklistItem.findFirst({
      where: { id: itemId, taskId, task: { weddingId } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

    const result = await prisma.$transaction(async (transaction) => {
      const item = await transaction.weddingTaskChecklistItem.update({
        where: { id: itemId },
        data: {
          title: payload.title,
          completed: payload.completed,
          sortOrder: payload.sortOrder,
        },
      });
      await syncTaskStatusFromChecklist(transaction, taskId);
      const task = await transaction.weddingTask.findUniqueOrThrow({
        where: { id: taskId },
        include: weddingTaskInclude,
      });
      return { item, task };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, taskId, itemId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingTaskChecklistItem.findFirst({
    where: { id: itemId, taskId, task: { weddingId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

  const task = await prisma.$transaction(async (transaction) => {
    await transaction.weddingTaskChecklistItem.delete({ where: { id: itemId } });
    await syncTaskStatusFromChecklist(transaction, taskId);
    return transaction.weddingTask.findUniqueOrThrow({
      where: { id: taskId },
      include: weddingTaskInclude,
    });
  });
  return NextResponse.json({ success: true, task });
}
