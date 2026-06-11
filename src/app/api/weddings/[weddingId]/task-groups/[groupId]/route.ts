import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingTaskGroupSchema } from "@/features/wedding/schemas/wedding.schema";
import { normalizeTaskGroupName } from "@/features/wedding-tasks/lib/task-rules";
import { validationErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string; groupId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = updateWeddingTaskGroupSchema.parse(await request.json());
    const existing = await prisma.weddingTaskGroup.findFirst({
      where: { id: groupId, weddingId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Task group not found" }, { status: 404 });

    const group = await prisma.weddingTaskGroup.update({
      where: { id: groupId },
      data: {
        name: payload.name,
        nameNormalized: payload.name ? normalizeTaskGroupName(payload.name) : undefined,
      },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Task group name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update task group" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const existing = await prisma.weddingTaskGroup.findFirst({
    where: { id: groupId, weddingId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Task group not found" }, { status: 404 });

  await prisma.weddingTaskGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ success: true });
}
