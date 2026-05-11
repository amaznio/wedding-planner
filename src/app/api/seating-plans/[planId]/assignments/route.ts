import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assignSeatSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
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

function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = assignSeatSchema.parse(body);

    const [table, guest] = await Promise.all([
      prisma.seatingTable.findFirst({
        where: { id: payload.tableId, planId },
        select: { id: true, seatCount: true },
      }),
      prisma.guest.findFirst({
        where: { id: payload.guestId, planId },
        select: { id: true },
      }),
    ]);

    if (!table) {
      return NextResponse.json({ error: "Table not found for plan" }, { status: 404 });
    }

    if (!guest) {
      return NextResponse.json({ error: "Guest not found for plan" }, { status: 404 });
    }

    if (payload.seatNumber > table.seatCount) {
      return NextResponse.json(
        { error: "Seat number exceeds current table seat count" },
        { status: 400 },
      );
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.seatAssignment.create({
        data: {
          planId,
          tableId: payload.tableId,
          guestId: payload.guestId,
          seatNumber: payload.seatNumber,
        },
      });
      await tx.guest.update({
        where: { id: payload.guestId },
        data: { plannedTableId: payload.tableId },
      });
      return created;
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];

      if (
        target.includes("planId") &&
        target.includes("tableId") &&
        target.includes("seatNumber")
      ) {
        return conflictResponse("Seat is already assigned");
      }

      if (target.includes("guestId")) {
        return conflictResponse("Guest is already assigned to a seat");
      }

      return conflictResponse("Assignment conflict");
    }

    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
