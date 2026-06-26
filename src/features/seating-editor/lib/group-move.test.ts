import assert from "node:assert/strict";
import test from "node:test";

import { buildGroupMovePlan } from "./group-move";

test("circle table adjacency wraps between last and first seats", () => {
  const result = buildGroupMovePlan({
    initiatorGuestId: "g1",
    targetTableId: "t1",
    targetSeatNumber: 6,
    pairSidePreference: "male-left",
    tables: [{ id: "t1", type: "circle", x: 0, y: 0, seatCount: 6 }],
    guests: [
      { id: "g1", sex: "male", assignment: null },
      { id: "g2", sex: "female", assignment: null },
    ],
    relationships: [
      {
        id: "r1",
        planId: "p1",
        type: "couple",
        name: null,
        preferredSeating: "adjacent",
        moveTogetherDefault: true,
        strict: false,
        guestIds: ["g1", "g2"],
        members: [
          { guestId: "g1", sortOrder: 0 },
          { guestId: "g2", sortOrder: 1 },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.assignments, [
    { guestId: "g1", tableId: "t1", seatNumber: 6 },
    { guestId: "g2", tableId: "t1", seatNumber: 1 },
  ]);
});
