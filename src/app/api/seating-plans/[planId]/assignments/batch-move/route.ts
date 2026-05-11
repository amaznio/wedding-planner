import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { batchMoveAssignmentsSchema } from "@/features/seating-editor/schemas/guest-assignment.schema";
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

function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export async function POST(request: Request, context: RouteContext) {
  const { planId } = await context.params;

  try {
    const body = await request.json();
    const payload = batchMoveAssignmentsSchema.parse(body);

    if (!payload.moveTogetherEnabled) {
      return NextResponse.json(
        { error: "Batch move requires moveTogetherEnabled=true" },
        { status: 400 },
      );
    }

    const plannedGuestIds = payload.plannedAssignments.map((item) => item.guestId);
    const plannedSeatKeys = payload.plannedAssignments.map(
      (item) => `${item.tableId}:${item.seatNumber}`,
    );
    if (new Set(plannedGuestIds).size !== plannedGuestIds.length) {
      return NextResponse.json(
        { error: "plannedAssignments contain duplicate guestId values" },
        { status: 400 },
      );
    }
    if (new Set(plannedSeatKeys).size !== plannedSeatKeys.length) {
      return NextResponse.json(
        { error: "plannedAssignments contain duplicate tableId/seatNumber targets" },
        { status: 400 },
      );
    }
    if (
      !payload.plannedAssignments.some(
        (item) =>
          item.guestId === payload.initiatorGuestId &&
          item.tableId === payload.targetTableId &&
          item.seatNumber === payload.targetSeatNumber,
      )
    ) {
      return NextResponse.json(
        { error: "initiatorGuestId must be present at target table/seat in plannedAssignments" },
        { status: 400 },
      );
    }

    const [guests, tables, currentAssignments] = await Promise.all([
      prisma.guest.findMany({
        where: {
          id: { in: plannedGuestIds },
          planId,
        },
        select: { id: true },
      }),
      prisma.seatingTable.findMany({
        where: {
          id: { in: payload.plannedAssignments.map((item) => item.tableId) },
          planId,
        },
        select: { id: true, seatCount: true, x: true, y: true },
      }),
      prisma.seatAssignment.findMany({
        where: { planId },
        select: { guestId: true, tableId: true, seatNumber: true },
      }),
    ]);

    if (guests.length !== plannedGuestIds.length) {
      return NextResponse.json(
        { error: "One or more planned guests do not belong to this plan" },
        { status: 400 },
      );
    }

    const tablesById = Object.fromEntries(tables.map((table) => [table.id, table]));
    if (Object.keys(tablesById).length !== new Set(payload.plannedAssignments.map((item) => item.tableId)).size) {
      return NextResponse.json(
        { error: "One or more planned tables do not belong to this plan" },
        { status: 400 },
      );
    }

    for (const assignment of payload.plannedAssignments) {
      const table = tablesById[assignment.tableId];
      if (!table || assignment.seatNumber > table.seatCount) {
        return NextResponse.json(
          { error: "One or more planned seats exceed table seat counts" },
          { status: 400 },
        );
      }
    }

    const movedGuestIdSet = new Set(plannedGuestIds);
    for (const assignment of payload.plannedAssignments) {
      const occupant = currentAssignments.find(
        (current) =>
          current.tableId === assignment.tableId &&
          current.seatNumber === assignment.seatNumber,
      );
      if (occupant && !movedGuestIdSet.has(occupant.guestId)) {
        return conflictResponse(
          "Batch move blocked: one or more destination seats are occupied by unrelated guests.",
        );
      }
    }

    const strictRelationships = await prisma.seatingRelationship.findMany({
      where: {
        id: { in: payload.context.relationshipIdsConsidered },
        planId,
        strict: true,
      },
      include: {
        members: {
          select: { guestId: true },
        },
      },
    });

    const targetTable = tablesById[payload.targetTableId];
    if (!targetTable) {
      return NextResponse.json({ error: "Target table not found for plan" }, { status: 400 });
    }
    const finalAssignmentsByGuestId = Object.fromEntries(
      payload.plannedAssignments.map((item) => [item.guestId, item]),
    );
    const finalAssignmentsBySeatKey = new Set(
      payload.plannedAssignments.map((item) => `${item.tableId}:${item.seatNumber}`),
    );

    for (const relationship of strictRelationships) {
      const members = relationship.members
        .map((member) => member.guestId)
        .filter((guestId) => guestId in finalAssignmentsByGuestId);
      if (members.length < 2) {
        continue;
      }

      if (relationship.preferredSeating === "same-table") {
        const firstTableId = finalAssignmentsByGuestId[members[0]].tableId;
        const allSameTable = members.every(
          (guestId) => finalAssignmentsByGuestId[guestId].tableId === firstTableId,
        );
        if (!allSameTable) {
          return conflictResponse(
            `Strict relationship "${relationship.name ?? relationship.type}" requires same-table placement.`,
          );
        }
      }

      if (relationship.preferredSeating === "adjacent") {
        const targetMemberSeat = finalAssignmentsByGuestId[payload.initiatorGuestId];
        if (!targetMemberSeat) {
          return conflictResponse("Strict adjacent relationship cannot be satisfied.");
        }
        const allOnSameTable = members.every(
          (guestId) =>
            finalAssignmentsByGuestId[guestId].tableId === targetMemberSeat.tableId,
        );
        if (!allOnSameTable) {
          return conflictResponse(
            `Strict relationship "${relationship.name ?? relationship.type}" requires adjacent seats on the same table.`,
          );
        }
        const seatNumbers = members
          .map((guestId) => finalAssignmentsByGuestId[guestId].seatNumber)
          .sort((a, b) => a - b);
        let contiguous = true;
        for (let i = 1; i < seatNumbers.length; i += 1) {
          if (seatNumbers[i] - seatNumbers[i - 1] !== 1) {
            contiguous = false;
            break;
          }
        }
        if (!contiguous) {
          return conflictResponse(
            `Strict relationship "${relationship.name ?? relationship.type}" requires adjacent seats.`,
          );
        }
      }

      if (relationship.preferredSeating === "nearby") {
        const initiatorAssignment = finalAssignmentsByGuestId[payload.initiatorGuestId];
        if (!initiatorAssignment) {
          return conflictResponse("Strict nearby relationship cannot be satisfied.");
        }
        const initiatorTable = tablesById[initiatorAssignment.tableId];
        if (!initiatorTable) {
          return conflictResponse("Strict nearby relationship references an unknown table.");
        }
        for (const guestId of members) {
          const guestAssignment = finalAssignmentsByGuestId[guestId];
          const guestTable = tablesById[guestAssignment.tableId];
          if (!guestTable) {
            return conflictResponse("Strict nearby relationship references an unknown table.");
          }
          const distance = Math.hypot(
            initiatorTable.x - guestTable.x,
            initiatorTable.y - guestTable.y,
          );
          const farThreshold = Math.hypot(targetTable.x - guestTable.x, targetTable.y - guestTable.y) + 600;
          if (distance > farThreshold) {
            return conflictResponse(
              `Strict relationship "${relationship.name ?? relationship.type}" nearby preference could not be satisfied.`,
            );
          }
        }
      }

      if (relationship.preferredSeating === "none") {
        // No extra strict constraint for none.
        void finalAssignmentsBySeatKey;
      }
    }

    const applied = await prisma.$transaction(async (tx) => {
      await tx.seatAssignment.deleteMany({
        where: {
          planId,
          guestId: { in: plannedGuestIds },
        },
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

      return tx.seatAssignment.findMany({
        where: {
          planId,
          guestId: { in: plannedGuestIds },
        },
        orderBy: { createdAt: "asc" },
      });
    });

    return NextResponse.json({ assignments: applied }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return conflictResponse("Batch move assignment conflict");
    }

    return NextResponse.json(
      { error: "Failed to execute batch move" },
      { status: 500 },
    );
  }
}
