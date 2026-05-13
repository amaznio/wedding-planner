import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { replaceRelationshipMembersSchema } from "@/features/seating-editor/schemas/relationship.schema";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{ planId: string; relationshipId: string }>;
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

export async function PUT(request: Request, context: RouteContext) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId, relationshipId } = await context.params;

  try {
    const body = await request.json();
    const payload = replaceRelationshipMembersSchema.parse(body);

    const relationship = await prisma.seatingRelationship.findFirst({
      where: {
        id: relationshipId,
        planId,
      },
      select: { id: true },
    });
    if (!relationship) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    const guests = await prisma.guest.findMany({
      where: {
        id: { in: payload.guestIds },
      },
      select: { id: true, planId: true },
    });

    if (guests.length !== payload.guestIds.length) {
      return NextResponse.json(
        { error: "One or more guests do not exist" },
        { status: 400 },
      );
    }

    const hasCrossPlanGuest = guests.some((guest) => guest.planId !== planId);
    if (hasCrossPlanGuest) {
      return NextResponse.json(
        { error: "All guests in a relationship must belong to this plan" },
        { status: 400 },
      );
    }

    const conflictingMemberships = await prisma.seatingRelationshipMember.findMany({
      where: {
        guestId: { in: payload.guestIds },
        relationship: {
          planId,
          id: { not: relationshipId },
        },
      },
      select: { guestId: true },
    });
    if (conflictingMemberships.length > 0) {
      return NextResponse.json(
        { error: "Each guest can belong to only one relationship" },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.seatingRelationshipMember.deleteMany({
        where: { relationshipId },
      });

      await tx.seatingRelationshipMember.createMany({
        data: payload.guestIds.map((guestId, index) => ({
          relationshipId,
          guestId,
          sortOrder: index,
        })),
      });

      return tx.seatingRelationship.findUniqueOrThrow({
        where: { id: relationshipId },
        include: {
          members: {
            select: { guestId: true, sortOrder: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return NextResponse.json({ relationship: toApiRelationship(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Failed to replace relationship members" },
      { status: 500 },
    );
  }
}
