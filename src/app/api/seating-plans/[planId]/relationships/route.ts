import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createRelationshipSchema } from "@/features/seating-editor/schemas/relationship.schema";
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

export async function GET(_: Request, context: RouteContext) {
  const { planId } = await context.params;

  const relationships = await prisma.seatingRelationship.findMany({
    where: { planId },
    include: {
      members: {
        select: { guestId: true, sortOrder: true },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    relationships: relationships.map((relationship) =>
      toApiRelationship(relationship),
    ),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = createRelationshipSchema.parse(body);

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });
    if (!existingPlan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
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

    const relationship = await prisma.$transaction(async (tx) => {
      const membershipsToReplace = await tx.seatingRelationshipMember.findMany({
        where: {
          guestId: { in: payload.guestIds },
          relationship: { planId },
        },
        select: { relationshipId: true },
      });

      const relationshipIdsToReplace = Array.from(
        new Set(membershipsToReplace.map((member) => member.relationshipId)),
      );

      if (relationshipIdsToReplace.length > 0) {
        await tx.seatingRelationship.deleteMany({
          where: {
            id: { in: relationshipIdsToReplace },
            planId,
          },
        });
      }

      return tx.seatingRelationship.create({
        data: {
          planId,
          type: payload.type,
          name: payload.name?.trim() || null,
          preferredSeating: payload.preferredSeating,
          moveTogetherDefault: payload.moveTogetherDefault,
          strict: payload.strict,
          members: {
            create: payload.guestIds.map((guestId, index) => ({
              guestId,
              sortOrder: index,
            })),
          },
        },
        include: {
          members: {
            select: { guestId: true, sortOrder: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return NextResponse.json(
      { relationship: toApiRelationship(relationship) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 },
    );
  }
}
