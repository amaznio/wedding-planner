import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { tableMutationSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
import type {
  TableDomainEvent,
  TableMutationResponse,
  TableSnapshotDelta,
} from "@/features/seating-editor/types/collaboration.types";
import type { SeatingTableType } from "@/features/seating-editor/types/seating-plan.types";
import { prisma } from "@/lib/prisma";
import { isTrustedRealtimeServiceRequest } from "@/lib/realtime-service-auth";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

type SeatLayout = "balanced" | "top-only" | "bottom-only";

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

function normalizeTableType(type: string): SeatingTableType {
  return type === "circle" ? "circle" : "rectangle";
}

function normalizeSeatLayout(seatLayout: string): SeatLayout {
  return seatLayout === "top-only" || seatLayout === "bottom-only"
    ? seatLayout
    : "balanced";
}

function toTableSnapshot(table: {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  seatCount: number;
  seatLayout: string;
}) {
  return {
    id: table.id,
    label: table.label,
    type: normalizeTableType(table.type),
    x: table.x,
    y: table.y,
    rotation: table.rotation,
    seatCount: table.seatCount,
    seatLayout: normalizeSeatLayout(table.seatLayout),
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;
  const isTrustedServiceRequest = isTrustedRealtimeServiceRequest(request);
  const authz = isTrustedServiceRequest
    ? { response: null, userId: null }
    : await requireSeatingPlanRole(planId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const mutation = tableMutationSchema.parse(body);

    const plan = await prisma.seatingPlan.findUnique({
      where: { id: planId },
      select: { id: true, planVersion: true },
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
        entityType: "table" as const,
        entityId: planId,
        actorId: authz.userId ?? null,
        clientVersion: mutation.baseVersion,
        serverVersion,
        occurredAt: new Date().toISOString(),
      };

      if (mutation.intent === "move_table") {
        const table = await tx.seatingTable.update({
          where: { id: mutation.payload.tableId },
          data: {
            x: mutation.payload.x,
            y: mutation.payload.y,
          },
        });

        const event: TableDomainEvent = {
          ...baseEvent,
          actionType: "move_table",
          payload: {
            intent: "move_table",
            tableId: table.id,
            x: table.x,
            y: table.y,
          },
        };

        const snapshotDelta: TableSnapshotDelta = {
          tables: [
            {
              table: toTableSnapshot(table),
            },
          ],
        };

        return { event, snapshotDelta, serverVersion };
      }

      if (mutation.intent === "update_table") {
        const currentTable = await tx.seatingTable.findFirst({
          where: {
            id: mutation.payload.tableId,
            planId,
          },
        });
        if (!currentTable) {
          throw new Error("Table not found for plan");
        }

        const nextSeatCount = mutation.payload.seatCount ?? currentTable.seatCount;

        const table = await tx.seatingTable.update({
          where: { id: mutation.payload.tableId },
          data: {
            ...(mutation.payload.label !== undefined ? { label: mutation.payload.label } : {}),
            ...(mutation.payload.seatCount !== undefined ? { seatCount: mutation.payload.seatCount } : {}),
            ...(mutation.payload.seatLayout !== undefined ? { seatLayout: mutation.payload.seatLayout } : {}),
          },
        });

        if (mutation.payload.seatCount !== undefined) {
          await tx.seatAssignment.deleteMany({
            where: {
              planId,
              tableId: table.id,
              seatNumber: { gt: mutation.payload.seatCount },
            },
          });
        }

        const event: TableDomainEvent = {
          ...baseEvent,
          actionType: "update_table",
          payload: {
            intent: "update_table",
            tableId: table.id,
            label: table.label,
            seatCount: nextSeatCount,
            seatLayout: (table.seatLayout as "balanced" | "top-only" | "bottom-only") ?? "balanced",
          },
        };

        const snapshotDelta: TableSnapshotDelta = {
          tables: [
            {
              table: toTableSnapshot(table),
            },
          ],
        };

        return { event, snapshotDelta, serverVersion };
      }

      if (mutation.intent === "add_table") {
        const table = await tx.seatingTable.create({
          data: {
            id: mutation.payload.table.id,
            planId,
            label: mutation.payload.table.label,
            type: mutation.payload.table.type,
            x: mutation.payload.table.x,
            y: mutation.payload.table.y,
            rotation: mutation.payload.table.rotation,
            seatCount: mutation.payload.table.seatCount,
            seatLayout: mutation.payload.table.seatLayout,
          },
        });

        const event: TableDomainEvent = {
          ...baseEvent,
          actionType: "add_table",
          payload: {
            intent: "add_table",
            tableId: table.id,
          },
        };

        const snapshotDelta: TableSnapshotDelta = {
          tables: [
            {
              table: toTableSnapshot(table),
            },
          ],
        };

        return { event, snapshotDelta, serverVersion };
      }

      if (mutation.intent === "delete_table") {
        await tx.seatingTable.delete({
          where: { id: mutation.payload.tableId },
        });

        const event: TableDomainEvent = {
          ...baseEvent,
          actionType: "delete_table",
          payload: {
            intent: "delete_table",
            tableId: mutation.payload.tableId,
          },
        };

        const snapshotDelta: TableSnapshotDelta = {
          tables: [],
          removedTableIds: [mutation.payload.tableId],
        };

        return { event, snapshotDelta, serverVersion };
      }

      const table = await tx.seatingTable.update({
        where: { id: mutation.payload.tableId },
        data: {
          rotation: mutation.payload.rotation,
        },
      });

      const event: TableDomainEvent = {
        ...baseEvent,
        actionType: "rotate_table",
        payload: {
          intent: "rotate_table",
          tableId: table.id,
          rotation: table.rotation,
        },
      };

      const snapshotDelta: TableSnapshotDelta = {
        tables: [
          {
            table: toTableSnapshot(table),
          },
        ],
      };

      return { event, snapshotDelta, serverVersion };
    });

    const result: TableMutationResponse = {
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
      return conflictResponse("Table mutation conflict");
    }

    const message = error instanceof Error ? error.message : "Failed to apply table mutation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
