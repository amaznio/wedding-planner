import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createGuestSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
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

export async function GET(_: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "viewer");
  if (authz.response) return authz.response;

  const plan = await prisma.seatingPlan.findUnique({
    where: { id: planId },
    select: { id: true, eventId: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
  }

  const guestsRaw = plan.eventId
    ? (
        await prisma.eventGuest.findMany({
          where: {
            eventId: plan.eventId,
            requiresSeat: true,
            rsvpStatus: { not: "declined" },
            guest: {
              planId,
            },
          },
          include: {
            guest: {
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
            },
          },
          orderBy: { createdAt: "asc" },
        })
      ).map((item) => item.guest)
    : await prisma.guest.findMany({
        where: { planId },
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
        orderBy: { createdAt: "asc" },
      });

  const guests = guestsRaw.map(({ assignments, ...guest }) => ({
    ...guest,
    assignment: assignments[0] ?? null,
  }));

  return NextResponse.json({ guests });
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = createGuestSchema.parse(body);

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        eventId: true,
        event: {
          select: { weddingId: true },
        },
      },
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

    const guest = await prisma.$transaction(async (tx) => {
      const createdGuest = await tx.guest.create({
        data: {
          planId,
          weddingId: existingPlan.event?.weddingId ?? null,
          name: payload.name,
          sex: payload.sex,
          ageCategory: payload.ageCategory,
          groupId: payload.groupId ?? null,
          plannedTableId: payload.plannedTableId ?? null,
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

      if (existingPlan.eventId) {
        await tx.eventGuest.upsert({
          where: {
            eventId_guestId: {
              eventId: existingPlan.eventId,
              guestId: createdGuest.id,
            },
          },
          create: {
            eventId: existingPlan.eventId,
            guestId: createdGuest.id,
            invitationStatus: "invited",
            rsvpStatus: "confirmed",
            requiresSeat: true,
          },
          update: {},
        });
      }

      return {
        ...createdGuest,
        assignment: createdGuest.assignments[0] ?? null,
      };
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
