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

      const existingTables = await tx.seatingTable.findMany({
        where: { planId },
        select: { id: true },
      });

      const existingTableIds = new Set(existingTables.map((table) => table.id));
      const incomingTableIds = new Set(
        payload.tables
          .map((table) => table.id)
          .filter((id): id is string => Boolean(id)),
      );

      const removedTableIds = [...existingTableIds].filter(
        (id) => !incomingTableIds.has(id),
      );

      if (removedTableIds.length > 0) {
        await tx.seatingTable.deleteMany({
          where: {
            planId,
            id: { in: removedTableIds },
          },
        });
      }

      for (const table of payload.tables) {
        if (table.id && existingTableIds.has(table.id)) {
          await tx.seatingTable.update({
            where: { id: table.id },
            data: {
              label: table.label,
              type: table.type,
              x: table.x,
              y: table.y,
              rotation: table.rotation,
              seatCount: table.seatCount,
              seatLayout: table.seatLayout,
            },
          });
        } else {
          await tx.seatingTable.create({
            data: {
              ...(table.id ? { id: table.id } : {}),
              planId,
              label: table.label,
              type: table.type,
              x: table.x,
              y: table.y,
              rotation: table.rotation,
              seatCount: table.seatCount,
              seatLayout: table.seatLayout,
            },
          });
        }
      }

      for (const table of payload.tables) {
        const tableId = table.id;
        if (!tableId) continue;

        await tx.seatAssignment.deleteMany({
          where: {
            planId,
            tableId,
            seatNumber: { gt: table.seatCount },
          },
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
