import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assignSeatSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

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
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = assignSeatSchema.parse(body);

    const plan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true, eventId: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const [table, guest, eventGuest] = await Promise.all([
      prisma.seatingTable.findFirst({
        where: { id: payload.tableId, planId },
        select: { id: true, seatCount: true },
      }),
      prisma.guest.findFirst({
        where: { id: payload.guestId, planId },
        select: { id: true },
      }),
      plan.eventId
        ? prisma.eventGuest.findUnique({
            where: {
              eventId_guestId: {
                eventId: plan.eventId,
                guestId: payload.guestId,
              },
            },
            select: {
              id: true,
              requiresSeat: true,
              rsvpStatus: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!table) {
      return NextResponse.json({ error: "Table not found for plan" }, { status: 404 });
    }

    if (!guest) {
      return NextResponse.json({ error: "Guest not found for plan" }, { status: 404 });
    }

    if (plan.eventId) {
      if (!eventGuest) {
        return NextResponse.json(
          { error: "Guest is not participating in this plan's event" },
          { status: 400 },
        );
      }
      if (!eventGuest.requiresSeat) {
        return NextResponse.json(
          { error: "Guest is marked as not requiring a seat for this event" },
          { status: 400 },
        );
      }
      if (eventGuest.rsvpStatus === "declined") {
        return NextResponse.json(
          { error: "Guest has declined this event and cannot be seated" },
          { status: 400 },
        );
      }
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
      await tx.seatingPlan.update({
        where: { id: planId },
        data: { planVersion: { increment: 1 } },
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
