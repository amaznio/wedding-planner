import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateGuestSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { prisma } from "@/lib/prisma";

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

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        name: payload.name,
        group: payload.group,
        notes: payload.notes,
      },
      include: {
        assignment: true,
      },
    });

    return NextResponse.json({ guest: updatedGuest });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { planId, guestId } = await context.params;

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
