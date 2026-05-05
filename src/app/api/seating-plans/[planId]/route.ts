import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateSeatingPlanSchema } from "@/features/seating-editor/schemas/seating-plan.schema";
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

  const plan = await prisma.seatingPlan.findUnique({
    where: { id: planId },
    include: {
      tables: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PUT(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = updateSeatingPlanSchema.parse(body);

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: "Seating plan not found" },
        { status: 404 },
      );
    }

    const updatedPlan = await prisma.$transaction(async (tx) => {
      await tx.seatingPlan.update({
        where: { id: planId },
        data: {
          name: payload.name,
          width: payload.width,
          height: payload.height,
        },
      });

      await tx.seatingTable.deleteMany({
        where: { planId },
      });

      if (payload.tables.length > 0) {
        await tx.seatingTable.createMany({
          data: payload.tables.map((table) => ({
            planId,
            label: table.label,
            type: table.type,
            x: table.x,
            y: table.y,
            rotation: table.rotation,
            seatCount: table.seatCount,
          })),
        });
      }

      return tx.seatingPlan.findUnique({
        where: { id: planId },
        include: {
          tables: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ plan: updatedPlan });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      {
        error: "Failed to update seating plan",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { planId } = await context.params;

  const existingPlan = await prisma.seatingPlan.findUnique({
    where: { id: planId },
    select: { id: true },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
  }

  await prisma.seatingPlan.delete({
    where: { id: planId },
  });

  return NextResponse.json({ success: true });
}
