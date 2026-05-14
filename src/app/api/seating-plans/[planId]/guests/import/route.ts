import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { importGuestRowsSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import { isPlusOneMarker } from "@/features/seating-editor/constants/plus-one";
import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
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

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      details: error.flatten(),
    },
    { status: 400 },
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  try {
    const guestFieldNames = new Set<string>(
      (((prisma as unknown as { _runtimeDataModel?: { models?: { Guest?: { fields?: Array<{ name: string }> } } } })
        ._runtimeDataModel?.models?.Guest?.fields ?? []) as Array<{ name: string }>).map(
        (field) => field.name,
      ),
    );
    const supportsPlaceholderField = guestFieldNames.has("isPlaceholderPlusOne");
    const supportsHostField = guestFieldNames.has("plusOneHostGuestId");

    const body = await request.json();
    const payload = importGuestRowsSchema.parse(body);

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

    const importResult = await prisma.$transaction(async (tx) => {
      const createdGuestIds: string[] = [];
      const createdRelationshipIds: string[] = [];
      const warnings: string[] = [];
      let skippedDuplicates = 0;
      let skippedInvalidMarkers = 0;
      let skippedRelationshipConflicts = 0;
      let createdPlusOnes = 0;
      let lastCreatedHostGuestId: string | null = null;

      const members = await tx.seatingRelationshipMember.findMany({
        where: { relationship: { planId } },
        select: { guestId: true },
      });
      const relationshipMemberGuestIds = new Set(members.map((member) => member.guestId));

      for (const row of payload.rows) {
        const name = row.name.trim();
        const marker = isPlusOneMarker(name);

        if (!row.include) {
          if (!marker) {
            skippedDuplicates += 1;
          }
          lastCreatedHostGuestId = null;
          continue;
        }

        if (marker) {
          if (!lastCreatedHostGuestId) {
            skippedInvalidMarkers += 1;
            warnings.push(
              `Line ${row.lineNumber}: marker "${name}" has no directly preceding host row.`,
            );
            continue;
          }

          if (relationshipMemberGuestIds.has(lastCreatedHostGuestId)) {
            skippedRelationshipConflicts += 1;
            warnings.push(
              `Line ${row.lineNumber}: host already has a relationship, so plus one was skipped.`,
            );
            lastCreatedHostGuestId = null;
            continue;
          }

          const plusOneGuest = await tx.guest.create({
            data: {
              planId,
              weddingId: existingPlan.event?.weddingId ?? null,
              name,
              groupId: null,
              notes: null,
              ...(supportsPlaceholderField ? { isPlaceholderPlusOne: true } : {}),
              ...(supportsHostField
                ? { plusOneHostGuestId: lastCreatedHostGuestId }
                : {}),
            },
          });
          if (existingPlan.eventId) {
            await tx.eventGuest.upsert({
              where: {
                eventId_guestId: {
                  eventId: existingPlan.eventId,
                  guestId: plusOneGuest.id,
                },
              },
              create: {
                eventId: existingPlan.eventId,
                guestId: plusOneGuest.id,
                invitationStatus: "invited",
                rsvpStatus: "confirmed",
                requiresSeat: true,
              },
              update: {},
            });
          }
          createdGuestIds.push(plusOneGuest.id);
          createdPlusOnes += 1;

          const plusOneRelationship = await tx.seatingRelationship.create({
            data: {
              planId,
              type: "plus_one",
              name: null,
              preferredSeating: "adjacent",
              moveTogetherDefault: true,
              strict: false,
              members: {
                create: [
                  {
                    guestId: lastCreatedHostGuestId,
                    sortOrder: 0,
                  },
                  {
                    guestId: plusOneGuest.id,
                    sortOrder: 1,
                  },
                ],
              },
            },
            select: { id: true },
          });

          createdRelationshipIds.push(plusOneRelationship.id);
          relationshipMemberGuestIds.add(lastCreatedHostGuestId);
          relationshipMemberGuestIds.add(plusOneGuest.id);
          lastCreatedHostGuestId = null;
          continue;
        }

        const createdGuest = await tx.guest.create({
          data: {
            planId,
            weddingId: existingPlan.event?.weddingId ?? null,
            name,
            groupId: null,
            notes: null,
          },
          select: { id: true },
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

        createdGuestIds.push(createdGuest.id);
        lastCreatedHostGuestId = createdGuest.id;
      }

      return {
        createdGuestIds,
        createdRelationshipIds,
        summary: {
          created: createdGuestIds.length,
          createdPlusOnes,
          skippedDuplicates,
          skippedInvalidMarkers,
          skippedRelationshipConflicts,
          warnings,
        },
      };
    }, { timeout: 30000, maxWait: 10000 });

    const [createdGuests, createdRelationshipsRaw] = await Promise.all([
      importResult.createdGuestIds.length > 0
        ? prisma.guest.findMany({
            where: { id: { in: importResult.createdGuestIds } },
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
          })
        : Promise.resolve([]),
      importResult.createdRelationshipIds.length > 0
        ? prisma.seatingRelationship.findMany({
            where: { id: { in: importResult.createdRelationshipIds } },
            include: {
              members: {
                select: { guestId: true, sortOrder: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        guests: createdGuests.map(({ assignments, ...guest }) => ({
          ...guest,
          assignment: assignments[0] ?? null,
        })),
        relationships: createdRelationshipsRaw.map((relationship) =>
          toApiRelationship(relationship),
        ),
        summary: importResult.summary,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to import guests" }, { status: 500 });
  }
}
