import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { updateWeddingGroupSchema } from "@/features/wedding/schemas/wedding.schema";
import { normalizeGroupName } from "@/features/seating-editor/lib/guest-groups";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string; groupId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  const group = await prisma.weddingGuestGroup.findFirst({
    where: { id: groupId, weddingId },
    include: {
      memberships: {
        include: { guest: true },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  return NextResponse.json({ group });
}

export async function PUT(request: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  try {
    const body = await request.json();
    const payload = updateWeddingGroupSchema.parse(body);
    const group = await prisma.weddingGuestGroup.findFirst({
      where: { id: groupId, weddingId },
      select: { id: true },
    });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const updated = await prisma.weddingGuestGroup.update({
      where: { id: groupId },
      data: {
        name: payload.name,
        nameNormalized: payload.name ? normalizeGroupName(payload.name) : undefined,
        color: payload.color,
      },
    });
    return NextResponse.json({ group: updated });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Group name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId, groupId } = await context.params;
  const group = await prisma.weddingGuestGroup.findFirst({
    where: { id: groupId, weddingId },
    select: { id: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  await prisma.weddingGuestGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ success: true });
}
