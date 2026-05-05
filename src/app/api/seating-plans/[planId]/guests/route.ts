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

    const guest = await prisma.guest.create({
      data: {
        planId,
        name: payload.name,
        group: payload.group,
        notes: payload.notes,
      },
      include: {
        assignment: true,
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
