import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ planId: string; tableId: string }>;
};

const autoSeatSchema = z.object({
  dryRun: z.boolean().optional(),
});

type GuestSex = "male" | "female" | "unknown";

type AutoSeatGuest = {
  id: string;
  sex: GuestSex;
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

function buildAlternatingOrder(guests: AutoSeatGuest[]) {
  const males = guests.filter((guest) => guest.sex === "male");
  const females = guests.filter((guest) => guest.sex === "female");
  const unknowns = guests.filter((guest) => guest.sex === "unknown");
  const ordered: AutoSeatGuest[] = [];

  let nextExpected: "male" | "female" =
    males.length >= females.length ? "male" : "female";
  let couldNotPerfectlyAlternate = false;
  let usedUnknown = false;

  while (males.length > 0 || females.length > 0 || unknowns.length > 0) {
    const expectedPool = nextExpected === "male" ? males : females;
    const oppositePool = nextExpected === "male" ? females : males;

    if (expectedPool.length > 0) {
      ordered.push(expectedPool.shift()!);
      nextExpected = nextExpected === "male" ? "female" : "male";
      continue;
    }

    if (unknowns.length > 0) {
      ordered.push(unknowns.shift()!);
      usedUnknown = true;
      continue;
    }

    if (oppositePool.length > 0) {
      ordered.push(oppositePool.shift()!);
      couldNotPerfectlyAlternate = true;
      nextExpected = nextExpected === "male" ? "female" : "male";
      continue;
    }
  }

  return {
    ordered,
    warnings: {
      usedUnknown,
      couldNotPerfectlyAlternate,
    },
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { planId, tableId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const payload = autoSeatSchema.parse(body);
    const dryRun = payload.dryRun ?? false;

    const table = await prisma.seatingTable.findFirst({
      where: {
        id: tableId,
        planId,
      },
      select: {
        id: true,
        planId: true,
        label: true,
        seatCount: true,
        plan: {
          select: {
            eventId: true,
          },
        },
      },
    });
    if (!table) {
      return NextResponse.json(
        { error: "Table not found for plan" },
        { status: 404 },
      );
    }

    const [tableAssignments, plannedGuestsRaw] = await Promise.all([
      prisma.seatAssignment.findMany({
        where: {
          planId,
          tableId,
        },
        orderBy: { seatNumber: "asc" },
      }),
      prisma.guest.findMany({
        where: {
          planId,
          plannedTableId: tableId,
          ...(table.plan.eventId
            ? {
                eventGuests: {
                  some: {
                    eventId: table.plan.eventId,
                    requiresSeat: true,
                    rsvpStatus: { not: "declined" },
                  },
                },
              }
            : {}),
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
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const plannedGuests = plannedGuestsRaw.map(({ assignments, ...guest }) => ({
      ...guest,
      assignment: assignments[0] ?? null,
    }));

    const warnings: string[] = [];
    if (plannedGuests.length > table.seatCount) {
      warnings.push("Planned guests exceed table capacity.");
    }

    const occupiedSeatNumbers = new Set(tableAssignments.map((row) => row.seatNumber));
    const emptySeatNumbers = Array.from({ length: table.seatCount }, (_, index) => index + 1).filter(
      (seatNumber) => !occupiedSeatNumbers.has(seatNumber),
    );
    const unseatedPlannedGuests = plannedGuests.filter((guest) => guest.assignment === null);

    if (unseatedPlannedGuests.length > emptySeatNumbers.length) {
      warnings.push("Not enough empty seats for all planned unseated guests.");
    }

    const maxAssignableCount = Math.min(unseatedPlannedGuests.length, emptySeatNumbers.length);
    const { ordered, warnings: alternationWarnings } = buildAlternatingOrder(
      unseatedPlannedGuests.map((guest) => ({
        id: guest.id,
        sex: guest.sex as GuestSex,
      })),
    );
    const guestsToAssign = ordered.slice(0, maxAssignableCount);

    if (alternationWarnings.usedUnknown) {
      warnings.push("Unknown-sex guests were used to fill alternation gaps.");
    }
    if (alternationWarnings.couldNotPerfectlyAlternate) {
      warnings.push("Perfect boy/girl alternation was not possible for all assigned guests.");
    }

    const plannedAssignments = guestsToAssign.map((guest, index) => ({
      guestId: guest.id,
      tableId,
      seatNumber: emptySeatNumbers[index],
    }));

    if (dryRun || plannedAssignments.length === 0) {
      return NextResponse.json({
        dryRun: true,
        table,
        assignmentsCreated: [],
        plannedAssignments,
        warnings,
        guests: plannedGuests,
        seatAssignments: tableAssignments,
      });
    }

    const assignmentRows = await prisma.$transaction(async (tx) => {
      const createdRows: Array<{
        id: string;
        planId: string;
        tableId: string;
        guestId: string;
        seatNumber: number;
      }> = [];

      for (const assignment of plannedAssignments) {
        const created = await tx.seatAssignment.create({
          data: {
            planId,
            tableId,
            guestId: assignment.guestId,
            seatNumber: assignment.seatNumber,
          },
        });
        createdRows.push(created);
        await tx.guest.update({
          where: { id: assignment.guestId },
          data: { plannedTableId: tableId },
        });
      }

      return createdRows;
    });

    const [affectedGuestsRaw, updatedTableAssignments] = await Promise.all([
      prisma.guest.findMany({
        where: {
          id: { in: plannedAssignments.map((item) => item.guestId) },
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
      }),
      prisma.seatAssignment.findMany({
        where: {
          planId,
          tableId,
        },
        orderBy: { seatNumber: "asc" },
      }),
    ]);
    const affectedGuests = affectedGuestsRaw.map(({ assignments, ...guest }) => ({
      ...guest,
      assignment: assignments[0] ?? null,
    }));

    return NextResponse.json(
      {
        dryRun: false,
        table,
        assignmentsCreated: assignmentRows,
        plannedAssignments,
        warnings,
        guests: affectedGuests,
        seatAssignments: updatedTableAssignments,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json({ error: "Failed to auto-seat table" }, { status: 500 });
  }
}
