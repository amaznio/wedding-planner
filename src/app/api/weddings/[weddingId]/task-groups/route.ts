import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createWeddingTaskGroupSchema } from "@/features/wedding/schemas/wedding.schema";
import { normalizeTaskGroupName } from "@/features/wedding-tasks/lib/task-rules";
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

  const groups = await prisma.weddingTaskGroup.findMany({
    where: { weddingId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { nameNormalized: "asc" },
  });
  return NextResponse.json({ groups });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const payload = createWeddingTaskGroupSchema.parse(await request.json());
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

    const group = await prisma.weddingTaskGroup.create({
      data: {
        weddingId,
        name: payload.name,
        nameNormalized: normalizeTaskGroupName(payload.name),
      },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Task group name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create task group" }, { status: 500 });
  }
}
