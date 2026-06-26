import assert from "node:assert/strict";
import test from "node:test";

import { updateSeatingPlanSchema } from "./seating-plan.schema";

const basePlan = {
  name: "Plan",
  width: 1400,
  height: 900,
  pairSidePreference: "auto",
};

test("update seating plan schema accepts circle table type", () => {
  const parsed = updateSeatingPlanSchema.parse({
    ...basePlan,
    tables: [
      {
        id: "t1",
        label: "Round",
        type: "circle",
        x: 120,
        y: 160,
        rotation: 0,
        seatCount: 8,
        seatLayout: "balanced",
      },
    ],
  });

  assert.equal(parsed.tables[0]?.type, "circle");
});

test("update seating plan schema rejects unknown table types", () => {
  assert.throws(() =>
    updateSeatingPlanSchema.parse({
      ...basePlan,
      tables: [
        {
          id: "t1",
          label: "Triangle",
          type: "triangle",
          x: 120,
          y: 160,
          rotation: 0,
          seatCount: 8,
          seatLayout: "balanced",
        },
      ],
    }),
  );
});
