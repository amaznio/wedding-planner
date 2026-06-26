import type {
  PreferredSeating,
  SeatingRelationship,
} from "../types/relationship.types";
import type { SeatingTableType } from "../types/seating-plan.types";

type TableLike = {
  id: string;
  type?: SeatingTableType;
  x: number;
  y: number;
  seatCount: number;
};

type GuestLike = {
  id: string;
  sex: "male" | "female" | "unknown";
  assignment: { tableId: string; seatNumber: number } | null;
};

export type PairSidePreference = "male-left" | "female-left";

export type PlannedAssignment = {
  guestId: string;
  tableId: string;
  seatNumber: number;
};

export type GroupMovePlanResult =
  | {
      ok: true;
      assignments: PlannedAssignment[];
      relationshipIdsConsidered: string[];
      movedGuestIds: string[];
    }
  | {
      ok: false;
      error: string;
      relationshipIdsConsidered: string[];
      movedGuestIds: string[];
    };

type PlanInput = {
  initiatorGuestId: string;
  targetTableId: string;
  targetSeatNumber: number;
  tables: TableLike[];
  guests: GuestLike[];
  relationships: SeatingRelationship[];
  pairSidePreference?: PairSidePreference;
};

function reorderAdjacentSeatsForPair(params: {
  adjacencySeats: number[];
  targetSeatNumber: number;
  initiatorSex: GuestLike["sex"];
  linkedGuestSex: GuestLike["sex"];
  pairSidePreference?: PairSidePreference;
}): number[] {
  const {
    adjacencySeats,
    targetSeatNumber,
    initiatorSex,
    linkedGuestSex,
    pairSidePreference,
  } = params;
  if (!pairSidePreference) return adjacencySeats;
  if (initiatorSex === "unknown" || linkedGuestSex === "unknown") return adjacencySeats;
  if (initiatorSex === linkedGuestSex) return adjacencySeats;

  const linkedGuestPrefersLeft =
    pairSidePreference === "male-left"
      ? linkedGuestSex === "male"
      : linkedGuestSex === "female";

  const preferredSeats = adjacencySeats.filter((seat) =>
    linkedGuestPrefersLeft ? seat < targetSeatNumber : seat > targetSeatNumber,
  );
  const fallbackSeats = adjacencySeats.filter((seat) =>
    linkedGuestPrefersLeft ? seat >= targetSeatNumber : seat <= targetSeatNumber,
  );

  return [...preferredSeats, ...fallbackSeats];
}

function seatDistances(
  seatCount: number,
  fromSeat: number,
  tableType: SeatingTableType = "rectangle",
): number[] {
  const seats = Array.from({ length: seatCount }, (_, i) => i + 1);
  return seats.sort((a, b) => {
    const directA = Math.abs(a - fromSeat);
    const directB = Math.abs(b - fromSeat);
    const da =
      tableType === "circle" ? Math.min(directA, seatCount - directA) : directA;
    const db =
      tableType === "circle" ? Math.min(directB, seatCount - directB) : directB;
    if (da !== db) return da - db;
    return a - b;
  });
}

function findNearestTables(origin: TableLike, tables: TableLike[]): TableLike[] {
  return [...tables].sort((a, b) => {
    if (a.id === origin.id) return -1;
    if (b.id === origin.id) return 1;
    const da = Math.hypot(a.x - origin.x, a.y - origin.y);
    const db = Math.hypot(b.x - origin.x, b.y - origin.y);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

function allocateSeat(
  tableId: string,
  orderedSeatNumbers: number[],
  occupiedBySeat: Record<string, string>,
  movableGuestIds: Set<string>,
): number | null {
  for (const seatNumber of orderedSeatNumbers) {
    const key = `${tableId}:${seatNumber}`;
    const occupiedGuestId = occupiedBySeat[key];
    if (!occupiedGuestId) {
      return seatNumber;
    }
    if (movableGuestIds.has(occupiedGuestId)) {
      return seatNumber;
    }
  }
  return null;
}

export function getAutoMoveTogetherRelationships(
  initiatorGuestId: string,
  relationshipsByGuestId: Record<string, SeatingRelationship[]>,
): SeatingRelationship[] {
  return (relationshipsByGuestId[initiatorGuestId] ?? []).filter(
    (relationship) => relationship.moveTogetherDefault,
  );
}

export function buildGroupMovePlan({
  initiatorGuestId,
  targetTableId,
  targetSeatNumber,
  tables,
  guests,
  relationships,
  pairSidePreference,
}: PlanInput): GroupMovePlanResult {
  const relevantRelationships = relationships.filter((relationship) =>
    relationship.guestIds.includes(initiatorGuestId),
  );
  const relationshipIdsConsidered = relevantRelationships.map((r) => r.id);
  const movedGuestIds = Array.from(
    new Set(
      relevantRelationships.flatMap((relationship) => relationship.guestIds),
    ),
  );
  if (movedGuestIds.length === 0) {
    return {
      ok: false,
      error: "No linked guests are eligible for grouped movement.",
      relationshipIdsConsidered,
      movedGuestIds,
    };
  }

  const tablesById = Object.fromEntries(tables.map((table) => [table.id, table]));
  const targetTable = tablesById[targetTableId];
  if (!targetTable) {
    return {
      ok: false,
      error: "Target table not found.",
      relationshipIdsConsidered,
      movedGuestIds,
    };
  }
  if (targetSeatNumber < 1 || targetSeatNumber > targetTable.seatCount) {
    return {
      ok: false,
      error: "Target seat is outside the table seat range.",
      relationshipIdsConsidered,
      movedGuestIds,
    };
  }

  const movableGuestIds = new Set(movedGuestIds);
  if (!movableGuestIds.has(initiatorGuestId)) {
    movableGuestIds.add(initiatorGuestId);
    movedGuestIds.unshift(initiatorGuestId);
  }

  const occupiedBySeat: Record<string, string> = {};
  for (const guest of guests) {
    if (!guest.assignment) continue;
    occupiedBySeat[`${guest.assignment.tableId}:${guest.assignment.seatNumber}`] =
      guest.id;
  }

  const targetSeatKey = `${targetTableId}:${targetSeatNumber}`;
  const targetOccupant = occupiedBySeat[targetSeatKey];
  if (targetOccupant && !movableGuestIds.has(targetOccupant)) {
    return {
      ok: false,
      error:
        "Cannot move linked guests here because the target seat is occupied by an unrelated guest.",
      relationshipIdsConsidered,
      movedGuestIds,
    };
  }

  const assignments: PlannedAssignment[] = [
    {
      guestId: initiatorGuestId,
      tableId: targetTableId,
      seatNumber: targetSeatNumber,
    },
  ];
  const assignedGuestIds = new Set<string>([initiatorGuestId]);
  const usedSeatKeys = new Set<string>([targetSeatKey]);

  const allLinkedGuestsOrdered = movedGuestIds
    .filter((guestId) => guestId !== initiatorGuestId)
    .sort((a, b) => a.localeCompare(b));
  const guestsById = Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  const initiatorGuest = guestsById[initiatorGuestId] ?? null;
  const pairLinkedGuestId = allLinkedGuestsOrdered.length === 1 ? allLinkedGuestsOrdered[0] : null;
  const pairLinkedGuest = pairLinkedGuestId ? guestsById[pairLinkedGuestId] ?? null : null;

  const adjacencySeats = seatDistances(
    targetTable.seatCount,
    targetSeatNumber,
    targetTable.type,
  ).filter((seatNumber) => seatNumber !== targetSeatNumber);

  const preferencesByGuestId: Record<string, PreferredSeating[]> = {};
  for (const relationship of relevantRelationships) {
    for (const guestId of relationship.guestIds) {
      if (guestId === initiatorGuestId) continue;
      if (!preferencesByGuestId[guestId]) {
        preferencesByGuestId[guestId] = [];
      }
      preferencesByGuestId[guestId].push(relationship.preferredSeating);
    }
  }

  for (const guestId of allLinkedGuestsOrdered) {
    const preferences = preferencesByGuestId[guestId] ?? ["none"];
    const needsAdjacent = preferences.includes("adjacent");
    const needsSameTable = preferences.includes("same-table");
    const needsNearby = preferences.includes("nearby");

    let assigned: PlannedAssignment | null = null;

    if (needsAdjacent) {
      const orderedAdjacentSeats =
        initiatorGuest &&
        pairLinkedGuest &&
        pairLinkedGuestId === guestId &&
        targetTable.type !== "circle"
          ? reorderAdjacentSeatsForPair({
              adjacencySeats,
              targetSeatNumber,
              initiatorSex: initiatorGuest.sex,
              linkedGuestSex: pairLinkedGuest.sex,
              pairSidePreference,
            })
          : adjacencySeats;
      const seat = allocateSeat(
        targetTableId,
        orderedAdjacentSeats.filter(
          (seatNumber) => !usedSeatKeys.has(`${targetTableId}:${seatNumber}`),
        ),
        occupiedBySeat,
        movableGuestIds,
      );
      if (!seat) {
        return {
          ok: false,
          error:
            "Strict adjacent preference could not be satisfied for one or more linked guests.",
          relationshipIdsConsidered,
          movedGuestIds,
        };
      }
      assigned = { guestId, tableId: targetTableId, seatNumber: seat };
    } else if (needsSameTable) {
      const seat = allocateSeat(
        targetTableId,
        Array.from({ length: targetTable.seatCount }, (_, i) => i + 1).filter(
          (seatNumber) => !usedSeatKeys.has(`${targetTableId}:${seatNumber}`),
        ),
        occupiedBySeat,
        movableGuestIds,
      );
      if (!seat) {
        return {
          ok: false,
          error:
            "Strict same-table preference could not be satisfied for one or more linked guests.",
          relationshipIdsConsidered,
          movedGuestIds,
        };
      }
      assigned = { guestId, tableId: targetTableId, seatNumber: seat };
    } else if (needsNearby) {
      const nearestTables = findNearestTables(targetTable, tables);
      for (const table of nearestTables) {
        const seat = allocateSeat(
          table.id,
          Array.from({ length: table.seatCount }, (_, i) => i + 1).filter(
            (seatNumber) => !usedSeatKeys.has(`${table.id}:${seatNumber}`),
          ),
          occupiedBySeat,
          movableGuestIds,
        );
        if (seat) {
          assigned = { guestId, tableId: table.id, seatNumber: seat };
          break;
        }
      }
      if (!assigned) {
        return {
          ok: false,
          error:
            "Strict nearby preference could not be satisfied for one or more linked guests.",
          relationshipIdsConsidered,
          movedGuestIds,
        };
      }
    } else {
      const nearestTables = findNearestTables(targetTable, tables);
      for (const table of nearestTables) {
        const seat = allocateSeat(
          table.id,
          Array.from({ length: table.seatCount }, (_, i) => i + 1).filter(
            (seatNumber) => !usedSeatKeys.has(`${table.id}:${seatNumber}`),
          ),
          occupiedBySeat,
          movableGuestIds,
        );
        if (seat) {
          assigned = { guestId, tableId: table.id, seatNumber: seat };
          break;
        }
      }
      if (!assigned) {
        return {
          ok: false,
          error: "Not enough available seats to move all linked guests together.",
          relationshipIdsConsidered,
          movedGuestIds,
        };
      }
    }

    assignments.push(assigned);
    assignedGuestIds.add(guestId);
    usedSeatKeys.add(`${assigned.tableId}:${assigned.seatNumber}`);
  }

  for (const [seatKey, occupantGuestId] of Object.entries(occupiedBySeat)) {
    if (!usedSeatKeys.has(seatKey)) continue;
    if (!movableGuestIds.has(occupantGuestId) && !assignedGuestIds.has(occupantGuestId)) {
      return {
        ok: false,
        error:
          "One or more selected seats are occupied by unrelated guests. Group move cannot continue.",
        relationshipIdsConsidered,
        movedGuestIds,
      };
    }
  }

  return {
    ok: true,
    assignments,
    relationshipIdsConsidered,
    movedGuestIds,
  };
}
