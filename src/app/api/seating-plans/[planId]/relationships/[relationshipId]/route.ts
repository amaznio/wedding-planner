import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateRelationshipSchema } from "@/features/seating-editor/schemas/relationship.schema";
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

export async function PATCH(request: Request, context: RouteContext) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId, relationshipId } = await context.params;

  try {
    const body = await request.json();
    const payload = updateRelationshipSchema.parse(body);

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

    const updated = await prisma.seatingRelationship.update({
      where: { id: relationshipId },
      data: {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.name !== undefined
          ? { name: payload.name?.trim() || null }
          : {}),
        ...(payload.preferredSeating !== undefined
          ? { preferredSeating: payload.preferredSeating }
          : {}),
        ...(payload.moveTogetherDefault !== undefined
          ? { moveTogetherDefault: payload.moveTogetherDefault }
          : {}),
        ...(payload.strict !== undefined ? { strict: payload.strict } : {}),
      },
      include: {
        members: {
          select: { guestId: true, sortOrder: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({ relationship: toApiRelationship(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      { error: "Failed to update relationship" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId, relationshipId } = await context.params;

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

  await prisma.seatingRelationship.delete({
    where: { id: relationshipId },
  });

  return NextResponse.json({ success: true });
}
