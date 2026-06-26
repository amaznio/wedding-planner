import assert from "node:assert/strict";
import test from "node:test";

import { getCircleSeatPositions } from "./seat-positioning";
import { getCircleTableDimensions, getRectangleTableDimensions } from "./table-dimensions";

test("circle table seats start at top and proceed clockwise", () => {
  const seats = getCircleSeatPositions(4);
  const dimensions = getCircleTableDimensions(4);
  const center = dimensions.width / 2;

  assert.equal(seats.length, 4);
  assert.equal(seats[0]?.seatNumber, 1);
  assert.ok(Math.abs((seats[0]?.x ?? 0) - center) < 0.0001);
  assert.ok((seats[0]?.y ?? Number.POSITIVE_INFINITY) < 0);
  assert.ok((seats[1]?.x ?? 0) > dimensions.width);
  assert.ok(Math.abs((seats[1]?.y ?? 0) - center) < 0.0001);
});

test("circle table ring radius grows enough to avoid seat overlap", () => {
  const seats = getCircleSeatPositions(50);
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < seats.length; index += 1) {
    const current = seats[index]!;
    const next = seats[(index + 1) % seats.length]!;
    minimumDistance = Math.min(
      minimumDistance,
      Math.hypot(next.x - current.x, next.y - current.y),
    );
  }

  assert.ok(minimumDistance >= 40);
});

test("rectangle dimensions remain unchanged for balanced odd seat counts", () => {
  assert.deepEqual(getRectangleTableDimensions(7, "balanced"), {
    width: 208,
    height: 80,
    topSeatCount: 4,
    bottomSeatCount: 3,
  });
});
