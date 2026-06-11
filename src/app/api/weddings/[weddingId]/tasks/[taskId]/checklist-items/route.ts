import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingTaskChecklistItemSchema } from "@/features/wedding/schemas/wedding.schema";
import { syncTaskStatusFromChecklist, weddingTaskInclude } from "@/features/wedding-tasks/lib/task-server";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; taskId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { weddingId, taskId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = createWeddingTaskChecklistItemSchema.parse(await request.json());
    const taskExists = await prisma.weddingTask.findFirst({
      where: { id: taskId, weddingId },
      select: { id: true },
    });
    if (!taskExists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const result = await prisma.$transaction(async (transaction) => {
      const aggregate = payload.sortOrder === undefined
        ? await transaction.weddingTaskChecklistItem.aggregate({
            where: { taskId },
            _max: { sortOrder: true },
          })
        : null;
      const item = await transaction.weddingTaskChecklistItem.create({
        data: {
          taskId,
          title: payload.title,
          completed: payload.completed,
          sortOrder: payload.sortOrder ?? (aggregate?._max.sortOrder ?? -1) + 1,
        },
      });
      await syncTaskStatusFromChecklist(transaction, taskId);
      const task = await transaction.weddingTask.findUniqueOrThrow({
        where: { id: taskId },
        include: weddingTaskInclude,
      });
      return { item, task };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 });
  }
}
