import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createGuestSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { prisma } from "@/lib/prisma";

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
  const { planId } = await context.params;

  const guests = await prisma.guest.findMany({
    where: { planId },
    include: {
      assignment: true,
      group: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ guests });
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = createGuestSchema.parse(body);

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    if (payload.groupId) {
      const group = await prisma.seatingGuestGroup.findFirst({
        where: {
          id: payload.groupId,
          planId,
        },
        select: { id: true },
      });

      if (!group) {
        return NextResponse.json(
          { error: "Group does not exist for this seating plan" },
          { status: 400 },
        );
      }
    }
    if (payload.plannedTableId) {
      const table = await prisma.seatingTable.findFirst({
        where: {
          id: payload.plannedTableId,
          planId,
        },
        select: { id: true },
      });

      if (!table) {
        return NextResponse.json(
          { error: "Table does not exist for this seating plan" },
          { status: 400 },
        );
      }
    }

    const guest = await prisma.guest.create({
      data: {
        planId,
        name: payload.name,
        sex: payload.sex,
        groupId: payload.groupId ?? null,
        plannedTableId: payload.plannedTableId ?? null,
        notes: payload.notes,
      },
      include: {
        assignment: true,
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
