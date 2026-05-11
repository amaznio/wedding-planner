import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPlusOneSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ planId: string; guestId: string }>;
};

type DbRelationship = {
  id: string;
  planId: string;
  type: string;
  name: string | null;
  preferredSeating: string;
  moveTogetherDefault: boolean;
  strict: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: Array<{ guestId: string; sortOrder: number | null }>;
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

function toApiRelationship(relationship: DbRelationship) {
  return {
    id: relationship.id,
    planId: relationship.planId,
    type: relationship.type,
    name: relationship.name,
    preferredSeating: relationship.preferredSeating,
    moveTogetherDefault: relationship.moveTogetherDefault,
    strict: relationship.strict,
    guestIds: relationship.members.map((member) => member.guestId),
    members: relationship.members.map((member) => ({
      guestId: member.guestId,
      sortOrder: member.sortOrder,
    })),
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { planId, guestId } = await context.params;

  try {
    const body = await request.json();
    const payload = createPlusOneSchema.parse(body);
    const plan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true, eventId: true, event: { select: { weddingId: true } } },
    });
    if (!plan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const hostGuest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        planId,
      },
      select: {
        id: true,
        isPlaceholderPlusOne: true,
      },
    });

    if (!hostGuest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    if (hostGuest.isPlaceholderPlusOne) {
      return NextResponse.json(
        { error: "Placeholder plus one guest cannot host another plus one" },
        { status: 400 },
      );
    }

    const existingMembership = await prisma.seatingRelationshipMember.findFirst({
      where: {
        guestId,
        relationship: { planId },
      },
      select: { id: true },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "Guest already has a relationship, plus one cannot be added" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const plusOneGuest = await tx.guest.create({
        data: {
          planId,
          weddingId: plan.event?.weddingId ?? null,
          name: payload.placeholderName.trim(),
          groupId: null,
          notes: null,
          isPlaceholderPlusOne: true,
          plusOneHostGuestId: guestId,
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

      if (plan.eventId) {
        await tx.eventGuest.upsert({
          where: {
            eventId_guestId: {
              eventId: plan.eventId,
              guestId: plusOneGuest.id,
            },
          },
          create: {
            eventId: plan.eventId,
            guestId: plusOneGuest.id,
            invitationStatus: "invited",
            rsvpStatus: "confirmed",
            requiresSeat: true,
          },
          update: {},
        });
      }

      const relationship = await tx.seatingRelationship.create({
        data: {
          planId,
          type: "plus_one",
          name: null,
          preferredSeating: "adjacent",
          moveTogetherDefault: true,
          strict: false,
          members: {
            create: [
              { guestId, sortOrder: 0 },
              { guestId: plusOneGuest.id, sortOrder: 1 },
            ],
          },
        },
        include: {
          members: {
            select: { guestId: true, sortOrder: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      return {
        plusOneGuest: {
          ...plusOneGuest,
          assignment: plusOneGuest.assignments[0] ?? null,
        },
        relationship: toApiRelationship(relationship),
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }
    return NextResponse.json({ error: "Failed to add plus one" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { planId, guestId } = await context.params;

  const hostGuest = await prisma.guest.findFirst({
    where: {
      id: guestId,
      planId,
    },
    select: { id: true },
  });
  if (!hostGuest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const relationship = await prisma.seatingRelationship.findFirst({
    where: {
      planId,
      type: "plus_one",
      members: { some: { guestId } },
    },
    include: {
      members: {
        select: { guestId: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!relationship) {
    return NextResponse.json({ error: "Plus one relationship not found" }, { status: 404 });
  }

  const pairedMember = relationship.members.find((member) => member.guestId !== guestId);
  if (!pairedMember) {
    return NextResponse.json({ error: "Plus one relationship is invalid" }, { status: 409 });
  }

  const pairedGuest = await prisma.guest.findFirst({
    where: {
      id: pairedMember.guestId,
      planId,
    },
    select: {
      id: true,
      isPlaceholderPlusOne: true,
      plusOneHostGuestId: true,
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.seatingRelationship.delete({
      where: { id: relationship.id },
    });

    let deletedPlaceholderGuestId: string | null = null;
    if (
      pairedGuest &&
      pairedGuest.isPlaceholderPlusOne &&
      pairedGuest.plusOneHostGuestId === guestId
    ) {
      await tx.guest.delete({ where: { id: pairedGuest.id } });
      deletedPlaceholderGuestId = pairedGuest.id;
    } else if (pairedGuest && pairedGuest.plusOneHostGuestId === guestId) {
      await tx.guest.update({
        where: { id: pairedGuest.id },
        data: { plusOneHostGuestId: null },
      });
    }

    return {
      success: true,
      relationshipId: relationship.id,
      deletedPlaceholderGuestId,
    };
  });

  return NextResponse.json(result);
}
