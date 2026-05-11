import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createSeatingPlanSchema } from "@/features/seating-editor/schemas/seating-plan.schema";
import { prisma } from "@/lib/prisma";

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  const plans = await prisma.seatingPlan.findMany({
    where: eventId ? { eventId } : undefined,
    include: {
      tables: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createSeatingPlanSchema.parse(body);

    if (payload.eventId) {
      const event = await prisma.weddingEvent.findUnique({
        where: { id: payload.eventId },
        select: { id: true },
      });
      if (!event) {
        return NextResponse.json({ error: "Wedding event not found" }, { status: 400 });
      }
    }

    const plan = await prisma.seatingPlan.create({
      data: {
        eventId: payload.eventId,
        name: payload.name,
        width: payload.width,
        height: payload.height,
        pairSidePreference: payload.pairSidePreference,
      },
      include: {
        tables: true,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      {
        error: "Failed to create seating plan",
      },
      { status: 500 },
    );
  }
}
