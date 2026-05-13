import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { createRelationshipSchema } from "@/features/seating-editor/schemas/relationship.schema";
import { prisma } from "@/lib/prisma";
import { requireAuthSession } from "@/lib/auth-session";

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
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

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
  const { unauthorized } = await requireAuthSession();
  if (unauthorized) return unauthorized;

  const { planId } = await context.params;
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const payload = createRelationshipSchema.parse(body);
    console.info("[relationships.create] received", {
      requestId,
      planId,
      type: payload.type,
      guestIdsCount: payload.guestIds.length,
      preferredSeating: payload.preferredSeating,
      moveTogetherDefault: payload.moveTogetherDefault,
      strict: payload.strict,
    });

    const existingPlan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });
    if (!existingPlan) {
      console.warn("[relationships.create] plan_not_found", {
        requestId,
        planId,
      });
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const guests = await prisma.guest.findMany({
      where: {
        id: { in: payload.guestIds },
      },
      select: { id: true, planId: true },
    });

    if (guests.length !== payload.guestIds.length) {
      console.warn("[relationships.create] guests_missing", {
        requestId,
        planId,
        payloadGuestIdsCount: payload.guestIds.length,
        fetchedGuestsCount: guests.length,
      });
      return NextResponse.json(
        { error: "One or more guests do not exist" },
        { status: 400 },
      );
    }

    const hasCrossPlanGuest = guests.some((guest) => guest.planId !== planId);
    if (hasCrossPlanGuest) {
      console.warn("[relationships.create] cross_plan_guest_detected", {
        requestId,
        planId,
      });
      return NextResponse.json(
        { error: "All guests in a relationship must belong to this plan" },
        { status: 400 },
      );
    }

    const [deletedRelationships, relationship] = await prisma.$transaction([
      prisma.seatingRelationship.deleteMany({
        where: {
          planId,
          members: {
            some: {
              guestId: { in: payload.guestIds },
            },
          },
        },
      }),
      prisma.seatingRelationship.create({
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
      }),
    ]);
    console.info("[relationships.create] success", {
      requestId,
      planId,
      relationshipId: relationship.id,
      deletedRelationshipsCount: deletedRelationships.count,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { relationship: toApiRelationship(relationship) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn("[relationships.create] validation_error", {
        requestId,
        planId,
        durationMs: Date.now() - startedAt,
        issues: error.issues,
      });
      return validationErrorResponse(error);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[relationships.create] prisma_known_error", {
        requestId,
        planId,
        durationMs: Date.now() - startedAt,
        code: error.code,
        meta: error.meta,
        message: error.message,
      });
    } else {
      console.error("[relationships.create] unexpected_error", {
        requestId,
        planId,
        durationMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      });
    }

    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 },
    );
  }
}
