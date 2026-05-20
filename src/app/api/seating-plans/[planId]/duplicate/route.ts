import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

function buildCopyName(sourceName: string, existingNames: Set<string>) {
  const baseName = `${sourceName} (Copy)`;
  if (!existingNames.has(baseName)) return baseName;

  let copyIndex = 2;
  while (existingNames.has(`${sourceName} (Copy ${copyIndex})`)) {
    copyIndex += 1;
  }

  return `${sourceName} (Copy ${copyIndex})`;
}

export async function POST(_: Request, context: RouteContext) {
  const { planId } = await context.params;
  const authz = await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  const startedAt = Date.now();
  let stage = "init";

  try {
    const duplicatedPlan = await prisma.$transaction(
      async (tx) => {
        stage = "load_source_plan";
        const sourcePlan = await tx.seatingPlan.findUnique({
        where: { id: planId },
        include: {
          event: { select: { id: true, name: true } },
          tables: { orderBy: { createdAt: "asc" } },
          groups: { orderBy: { createdAt: "asc" } },
          guests: {
            orderBy: { createdAt: "asc" },
            include: {
              eventGuests: {
                select: {
                  eventId: true,
                  invitationStatus: true,
                  rsvpStatus: true,
                  requiresSeat: true,
                  notes: true,
                },
              },
            },
          },
          relationships: {
            orderBy: { createdAt: "asc" },
            include: {
              members: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          assignments: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!sourcePlan) {
        stage = "source_plan_not_found";
        return null;
      }

      stage = "resolve_clone_name";
      const siblingPlans = await tx.seatingPlan.findMany({
        where: {
          eventId: sourcePlan.eventId ?? null,
        },
        select: { name: true },
      });
      const existingNames = new Set(siblingPlans.map((plan) => plan.name));
      const cloneName = buildCopyName(sourcePlan.name, existingNames);

      stage = "create_plan";
      const newPlan = await tx.seatingPlan.create({
        data: {
          name: cloneName,
          eventId: sourcePlan.eventId,
          width: sourcePlan.width,
          height: sourcePlan.height,
          pairSidePreference: sourcePlan.pairSidePreference,
        },
      });

      const tableIdMap = new Map<string, string>();
      stage = "clone_tables";
      for (const table of sourcePlan.tables) {
        tableIdMap.set(table.id, randomUUID());
      }
      if (sourcePlan.tables.length > 0) {
        await tx.seatingTable.createMany({
          data: sourcePlan.tables.map((table) => ({
            id: tableIdMap.get(table.id)!,
            planId: newPlan.id,
            label: table.label,
            type: table.type,
            x: table.x,
            y: table.y,
            rotation: table.rotation,
            seatCount: table.seatCount,
            seatLayout: table.seatLayout,
          })),
        });
      }

      const groupIdMap = new Map<string, string>();
      stage = "clone_groups";
      for (const group of sourcePlan.groups) {
        groupIdMap.set(group.id, randomUUID());
      }
      if (sourcePlan.groups.length > 0) {
        await tx.seatingGuestGroup.createMany({
          data: sourcePlan.groups.map((group) => ({
            id: groupIdMap.get(group.id)!,
            planId: newPlan.id,
            name: group.name,
            nameNormalized: group.nameNormalized,
            color: group.color,
          })),
        });
      }

      const guestIdMap = new Map<string, string>();
      stage = "prepare_guest_id_map";
      for (const guest of sourcePlan.guests) {
        const guestId = randomUUID();
        guestIdMap.set(guest.id, guestId);
      }

      stage = "clone_guests";
      if (sourcePlan.guests.length > 0) {
        await tx.guest.createMany({
          data: sourcePlan.guests.map((guest) => ({
            id: guestIdMap.get(guest.id)!,
            planId: newPlan.id,
            weddingId: guest.weddingId,
            name: guest.name,
            sex: guest.sex,
            ageCategory: guest.ageCategory,
            groupId: guest.groupId ? (groupIdMap.get(guest.groupId) ?? null) : null,
            plannedTableId: guest.plannedTableId
              ? (tableIdMap.get(guest.plannedTableId) ?? null)
              : null,
            dietaryRestrictions: guest.dietaryRestrictions,
            notes: guest.notes,
            isPlaceholderPlusOne: guest.isPlaceholderPlusOne,
          })),
        });
      }

      stage = "clone_plus_one_links";
      for (const guest of sourcePlan.guests) {
        if (!guest.plusOneHostGuestId) continue;
        const newGuestId = guestIdMap.get(guest.id);
        const newHostGuestId = guestIdMap.get(guest.plusOneHostGuestId);
        if (!newGuestId || !newHostGuestId) continue;

        await tx.guest.update({
          where: { id: newGuestId },
          data: { plusOneHostGuestId: newHostGuestId },
        });
      }

      stage = "clone_event_guests";
      const eventGuestsToCreate = sourcePlan.guests.flatMap((guest) => {
        const newGuestId = guestIdMap.get(guest.id);
        if (!newGuestId) return [];
        return guest.eventGuests.map((eventGuest) => ({
          eventId: eventGuest.eventId,
          guestId: newGuestId,
          invitationStatus: eventGuest.invitationStatus,
          rsvpStatus: eventGuest.rsvpStatus,
          requiresSeat: eventGuest.requiresSeat,
          notes: eventGuest.notes,
        }));
      });
      if (eventGuestsToCreate.length > 0) {
        await tx.eventGuest.createMany({
          data: eventGuestsToCreate,
        });
      }

      const relationshipIdMap = new Map<string, string>();
      stage = "clone_relationships";
      for (const relationship of sourcePlan.relationships) {
        relationshipIdMap.set(relationship.id, randomUUID());
      }
      if (sourcePlan.relationships.length > 0) {
        await tx.seatingRelationship.createMany({
          data: sourcePlan.relationships.map((relationship) => ({
            id: relationshipIdMap.get(relationship.id)!,
            planId: newPlan.id,
            type: relationship.type,
            name: relationship.name,
            preferredSeating: relationship.preferredSeating,
            moveTogetherDefault: relationship.moveTogetherDefault,
            strict: relationship.strict,
          })),
        });
      }

      stage = "clone_relationship_members";
      const relationshipMembersToCreate = sourcePlan.relationships.flatMap((relationship) => {
        const newRelationshipId = relationshipIdMap.get(relationship.id);
        if (!newRelationshipId) return [];
        return relationship.members
          .map((member) => {
            const newGuestId = guestIdMap.get(member.guestId);
            if (!newGuestId) return null;
            return {
              relationshipId: newRelationshipId,
              guestId: newGuestId,
              sortOrder: member.sortOrder,
            };
          })
          .filter((member): member is { relationshipId: string; guestId: string; sortOrder: number | null } => Boolean(member));
      });
      if (relationshipMembersToCreate.length > 0) {
        await tx.seatingRelationshipMember.createMany({
          data: relationshipMembersToCreate,
        });
      }

      stage = "clone_assignments";
      const assignmentsToCreate = sourcePlan.assignments
        .map((assignment) => {
          const newTableId = tableIdMap.get(assignment.tableId);
          const newGuestId = guestIdMap.get(assignment.guestId);
          if (!newTableId || !newGuestId) return null;
          return {
            planId: newPlan.id,
            tableId: newTableId,
            guestId: newGuestId,
            seatNumber: assignment.seatNumber,
          };
        })
        .filter((assignment): assignment is { planId: string; tableId: string; guestId: string; seatNumber: number } => Boolean(assignment));
      if (assignmentsToCreate.length > 0) {
        await tx.seatAssignment.createMany({
          data: assignmentsToCreate,
        });
      }

      stage = "hydrate_result";
      const hydrated = await tx.seatingPlan.findUnique({
        where: { id: newPlan.id },
        select: {
          id: true,
          name: true,
          width: true,
          height: true,
          updatedAt: true,
          assignments: { select: { id: true } },
          guests: { select: { id: true } },
          event: { select: { id: true, name: true } },
        },
      });

        return hydrated;
      },
      {
        maxWait: 10_000,
        timeout: 15_000,
      },
    );

    if (!duplicatedPlan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    console.info("[duplicate-plan] success", {
      planId,
      clonedPlanId: duplicatedPlan.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ plan: duplicatedPlan }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[duplicate-plan] failed", {
      planId,
      stage,
      durationMs: Date.now() - startedAt,
      error: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      { error: "Failed to duplicate seating plan", stage, details: errorMessage },
      { status: 500 },
    );
  }
}
