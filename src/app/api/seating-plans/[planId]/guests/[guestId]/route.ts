import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateGuestSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string; guestId: string }>;
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
  const { planId, guestId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateGuestSchema.parse(body);

    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        planId,
      },
      select: { id: true },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    if (payload.groupId !== undefined && payload.groupId !== null) {
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
    if (payload.plannedTableId !== undefined && payload.plannedTableId !== null) {
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

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        name: payload.name,
        sex: payload.sex,
        ageCategory: payload.ageCategory,
        groupId: payload.groupId,
        plannedTableId: payload.plannedTableId,
        notes: payload.notes,
      },
      include: {
        assignments: {
          where: { planId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      guest: {
        ...updatedGuest,
        assignment: updatedGuest.assignments[0] ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { planId, guestId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  const guest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      planId,
    },
    select: { id: true },
  });

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  await prisma.guest.delete({
    where: { id: guestId },
  });

  return NextResponse.json({ success: true });
}
