import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { createWeddingGroupSchema } from "@/features/wedding/schemas/wedding.schema";
import { normalizeGroupName } from "@/features/seating-editor/lib/guest-groups";
import { prisma } from "@/lib/prisma";
import { validationErrorResponse } from "@/lib/api-errors";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const groups = await prisma.weddingGuestGroup.findMany({
    where: { weddingId },
    include: {
      memberships: {
        include: { guest: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ groups });
}

export async function POST(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  try {
    const body = await request.json();
    const payload = createWeddingGroupSchema.parse(body);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

    const group = await prisma.weddingGuestGroup.create({
      data: {
        weddingId,
        name: payload.name,
        nameNormalized: normalizeGroupName(payload.name),
        color: payload.color,
      },
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Group name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
