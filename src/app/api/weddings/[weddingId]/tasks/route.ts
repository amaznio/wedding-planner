import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingTaskSchema } from "@/features/wedding/schemas/wedding.schema";
import { validateTaskLinks, weddingTaskInclude } from "@/features/wedding-tasks/lib/task-server";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "viewer");
  if (authz.response) return authz.response;

  const tasks = await prisma.weddingTask.findMany({
    where: { weddingId },
    include: weddingTaskInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = createWeddingTaskSchema.parse(await request.json());
    const linkError = await validateTaskLinks(weddingId, payload);
    if (linkError) return linkError;

    const task = await prisma.weddingTask.create({
      data: {
        weddingId,
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
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
