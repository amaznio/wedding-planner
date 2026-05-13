import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGroupColorByIndex, normalizeGroupName } from "@/features/seating-editor/lib/guest-groups";
import { createGuestGroupSchema } from "@/features/seating-editor/schemas/guest-group.schema";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{ planId: string }>;
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

export async function GET(_: Request, context: RouteContext) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId } = await context.params;

  const groups = await prisma.seatingGuestGroup.findMany({
    where: { planId },
    include: {
      _count: {
        select: { guests: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    groups: groups.map((group) => ({
      id: group.id,
      planId: group.planId,
      name: group.name,
      color: group.color,
      guestCount: group._count.guests,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = createGuestGroupSchema.parse(body);

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const existingGroupCount = await prisma.seatingGuestGroup.count({
      where: { planId },
    });

    const group = await prisma.seatingGuestGroup.create({
      data: {
        planId,
        name: payload.name.trim(),
        nameNormalized: normalizeGroupName(payload.name),
        color: getGroupColorByIndex(existingGroupCount),
      },
      include: {
        _count: {
          select: { guests: true },
        },
      },
    });

    return NextResponse.json(
      {
        group: {
          id: group.id,
          planId: group.planId,
          name: group.name,
          color: group.color,
          guestCount: group._count.guests,
        },
      },
      { status: 201 },
    );
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

    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
