import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { assignmentMutationSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import type {
  AssignmentDomainEvent,
  AssignmentMutationResponse,
  AssignmentSnapshotDelta,
} from "@/features/seating-editor/types/collaboration.types";
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
    const mutation = assignmentMutationSchema.parse(body);

    const plan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true, planVersion: true, eventId: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Seating plan not found" }, { status: 404 });
    }

    const currentVersion = plan.planVersion;
    const response = await prisma.$transaction(async (tx) => {
      const nextVersionRecord = await tx.seatingPlan.update({
        where: { id: planId },
        data: { planVersion: { increment: 1 } },
        select: { planVersion: true },
      });
      const serverVersion = nextVersionRecord.planVersion;
      const eventId = `evt-${mutation.mutationId}-${serverVersion}`;
      const baseEvent = {
        eventId,
        entityType: "assignment" as const,
        entityId: planId,
        actorId: authz.userId ?? null,
        clientVersion: mutation.baseVersion,
        serverVersion,
        occurredAt: new Date().toISOString(),
      };

      if (mutation.intent === "assign") {
        const payload = mutation.payload;
        const [table, guest, eventGuest] = await Promise.all([
          tx.seatingTable.findFirst({
            where: { id: payload.tableId, planId },
            select: { id: true, seatCount: true },
          }),
          tx.guest.findFirst({
            where: { id: payload.guestId, planId },
            select: { id: true },
          }),
          plan.eventId
            ? tx.eventGuest.findUnique({
                where: {
                  eventId_guestId: {
                    eventId: plan.eventId,
                    guestId: payload.guestId,
                  },
                },
                select: { id: true, requiresSeat: true, rsvpStatus: true },
              })
            : Promise.resolve(null),
        ]);

        if (!table) {
          throw new Error("Table not found for plan");
        }
        if (!guest) {
          throw new Error("Guest not found for plan");
        }
        if (plan.eventId) {
          if (!eventGuest) throw new Error("Guest is not participating in this plan's event");
          if (!eventGuest.requiresSeat) throw new Error("Guest is marked as not requiring a seat for this event");
          if (eventGuest.rsvpStatus === "declined") throw new Error("Guest has declined this event and cannot be seated");
        }
        if (payload.seatNumber > table.seatCount) {
          throw new Error("Seat number exceeds current table seat count");
        }

        const targetGuestCurrent = await tx.seatAssignment.findUnique({
          where: { planId_guestId: { planId, guestId: payload.guestId } },
        });
        const seatOccupant = await tx.seatAssignment.findUnique({
          where: {
            planId_tableId_seatNumber: {
              planId,
              tableId: payload.tableId,
              seatNumber: payload.seatNumber,
            },
          },
        });
        if (
          targetGuestCurrent &&
          targetGuestCurrent.tableId === payload.tableId &&
          targetGuestCurrent.seatNumber === payload.seatNumber
        ) {
          const event: AssignmentDomainEvent = {
            ...baseEvent,
            actionType: "assign.noop",
            payload: {
              intent: "assign",
              guestId: payload.guestId,
              tableId: payload.tableId,
              seatNumber: payload.seatNumber,
              swappedGuestId: null,
            },
          };
          const snapshotDelta: AssignmentSnapshotDelta = {
            guestsAssignments: [
              {
                guestId: payload.guestId,
                assignment: targetGuestCurrent,
                plannedTableId: payload.tableId,
              },
            ],
          };
          return { event, snapshotDelta, serverVersion };
        }

        if (targetGuestCurrent) {
          await tx.seatAssignment.delete({ where: { id: targetGuestCurrent.id } });
        }
        let swappedGuestId: string | null = null;
        if (seatOccupant) {
          swappedGuestId = seatOccupant.guestId;
          await tx.seatAssignment.delete({ where: { id: seatOccupant.id } });
        }

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

        let swappedAssignment: Prisma.SeatAssignmentGetPayload<object> | null = null;
        if (swappedGuestId && targetGuestCurrent) {
          swappedAssignment = await tx.seatAssignment.create({
            data: {
              planId,
              tableId: targetGuestCurrent.tableId,
              guestId: swappedGuestId,
              seatNumber: targetGuestCurrent.seatNumber,
            },
          });
          await tx.guest.update({
            where: { id: swappedGuestId },
            data: { plannedTableId: targetGuestCurrent.tableId },
          });
        } else if (swappedGuestId && !targetGuestCurrent) {
          await tx.guest.update({
            where: { id: swappedGuestId },
            data: { plannedTableId: null },
          });
        }

        const event: AssignmentDomainEvent = {
          ...baseEvent,
          actionType: "assign",
          payload: {
            intent: "assign",
            guestId: payload.guestId,
            tableId: payload.tableId,
            seatNumber: payload.seatNumber,
            swappedGuestId,
          },
        };
        const snapshotDelta: AssignmentSnapshotDelta = {
          guestsAssignments: [
            {
              guestId: payload.guestId,
              assignment: created,
              plannedTableId: payload.tableId,
            },
            ...(swappedGuestId
              ? [
                  {
                    guestId: swappedGuestId,
                    assignment: swappedAssignment,
                    plannedTableId: swappedAssignment?.tableId ?? null,
                  },
                ]
              : []),
          ],
        };
        return { event, snapshotDelta, serverVersion };
      }

      if (mutation.intent === "unassign") {
        const payload = mutation.payload;
        const existing = await tx.seatAssignment.findUnique({
          where: { planId_guestId: { planId, guestId: payload.guestId } },
        });
        if (existing) {
          await tx.seatAssignment.delete({ where: { id: existing.id } });
        }
        await tx.guest.update({
          where: { id: payload.guestId },
          data: { plannedTableId: null },
        });

        const event: AssignmentDomainEvent = {
          ...baseEvent,
          actionType: "unassign",
          payload: { intent: "unassign", guestId: payload.guestId },
        };
        const snapshotDelta: AssignmentSnapshotDelta = {
          guestsAssignments: [
            {
              guestId: payload.guestId,
              assignment: null,
              plannedTableId: null,
            },
          ],
        };
        return { event, snapshotDelta, serverVersion };
      }

      const payload = mutation.payload;
      const plannedGuestIds = payload.plannedAssignments.map((item) => item.guestId);
      const uniqueGuestCount = new Set(plannedGuestIds).size;
      if (uniqueGuestCount !== plannedGuestIds.length) {
        throw new Error("plannedAssignments contain duplicate guestId values");
      }

      const tables = await tx.seatingTable.findMany({
        where: {
          id: { in: payload.plannedAssignments.map((item) => item.tableId) },
          planId,
        },
        select: { id: true, seatCount: true },
      });
      const tablesById = Object.fromEntries(tables.map((table) => [table.id, table]));
      for (const assignment of payload.plannedAssignments) {
        const table = tablesById[assignment.tableId];
        if (!table || assignment.seatNumber > table.seatCount) {
          throw new Error("One or more planned seats exceed table seat counts");
        }
      }

      await tx.seatAssignment.deleteMany({
        where: { planId, guestId: { in: plannedGuestIds } },
      });
      await tx.seatAssignment.createMany({
        data: payload.plannedAssignments.map((item) => ({
          planId,
          tableId: item.tableId,
          guestId: item.guestId,
          seatNumber: item.seatNumber,
        })),
      });
      for (const item of payload.plannedAssignments) {
        await tx.guest.update({
          where: { id: item.guestId },
          data: { plannedTableId: item.tableId },
        });
      }
      const applied = await tx.seatAssignment.findMany({
        where: { planId, guestId: { in: plannedGuestIds } },
      });

      const assignmentsByGuest = Object.fromEntries(applied.map((item) => [item.guestId, item]));
      const event: AssignmentDomainEvent = {
        ...baseEvent,
        actionType: "batch_move",
        payload: {
          intent: "batch_move",
          guestIds: plannedGuestIds,
          targetTableId: payload.targetTableId,
          targetSeatNumber: payload.targetSeatNumber,
        },
      };
      const snapshotDelta: AssignmentSnapshotDelta = {
        guestsAssignments: plannedGuestIds.map((guestId) => ({
          guestId,
          assignment: assignmentsByGuest[guestId] ?? null,
          plannedTableId: assignmentsByGuest[guestId]?.tableId ?? null,
        })),
      };
      return { event, snapshotDelta, serverVersion };
    });

    const result: AssignmentMutationResponse = {
      ack: {
        mutationId: mutation.mutationId,
        status: mutation.baseVersion === currentVersion ? "applied" : "transformed",
        planVersion: response.serverVersion,
        appliedEventIds: [response.event.eventId],
      },
      events: [response.event],
      snapshotDelta: response.snapshotDelta,
    };
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return conflictResponse("Assignment conflict");
    }
    const message = error instanceof Error ? error.message : "Failed to apply assignment mutation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

