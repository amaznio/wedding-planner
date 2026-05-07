import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { normalizeGroupName } from "@/features/seating-editor/lib/guest-groups";
import { updateGuestGroupSchema } from "@/features/seating-editor/schemas/guest-group.schema";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ planId: string; groupId: string }>;
};

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { planId, groupId } = await context.params;

  try {
    const body = await request.json();
    const payload = updateGuestGroupSchema.parse(body);

    const existing = await prisma.seatingGuestGroup.findFirst({
      where: { id: groupId, planId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const updated = await prisma.seatingGuestGroup.update({
      where: { id: groupId },
      data: {
        ...(payload.name !== undefined
          ? {
              name: payload.name.trim(),
              nameNormalized: normalizeGroupName(payload.name),
            }
          : {}),
        ...(payload.color !== undefined ? { color: payload.color } : {}),
      },
      include: {
        _count: {
          select: { guests: true },
        },
      },
    });

    return NextResponse.json({
      group: {
        id: updated.id,
        planId: updated.planId,
        name: updated.name,
        color: updated.color,
        guestCount: updated._count.guests,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Group name already exists for this seating plan" },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { planId, groupId } = await context.params;

  const existing = await prisma.seatingGuestGroup.findFirst({
    where: { id: groupId, planId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  await prisma.seatingGuestGroup.delete({
    where: { id: groupId },
  });

  return NextResponse.json({ success: true });
}
