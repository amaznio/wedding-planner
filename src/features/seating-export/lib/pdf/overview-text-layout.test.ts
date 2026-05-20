import assert from "node:assert/strict";
import test from "node:test";

import { getRotatedOverviewTextLayout } from "./build-pdf";

test("overview text layout keeps centered stack at 0 degrees", () => {
  const centerX = 200;
  const centerY = 300;
  const layout = getRotatedOverviewTextLayout({
    centerX,
    centerY,
    rotationDegrees: 0,
    tableShortSide: 80,
    labelWidth: 60,
    occupancyWidth: 36,
    occupancyText: "2/2",
    labelLineHeight: 9,
    occupancyLineHeight: 8,
    occupancyFont: {
      widthOfTextAtSize: (_text: string, size: number) => 36 * (size / 8),
    } as never,
    labelSize: 9,
    occupancySize: 8,
  });

  assert.equal(Math.round((layout.labelCenter.x + layout.occupancyCenter.x) / 2), centerX);
  assert.equal(Math.round((layout.labelCenter.y + layout.occupancyCenter.y) / 2), centerY);
});

test("overview text layout keeps centered stack at 90 and 270 degrees", () => {
  const centerX = 120;
  const centerY = 180;
  for (const rotation of [90, 270]) {
    const layout = getRotatedOverviewTextLayout({
      centerX,
      centerY,
      rotationDegrees: rotation,
      tableShortSide: 90,
      labelWidth: 72,
      occupancyWidth: 40,
      occupancyText: "42/42",
      labelLineHeight: 9,
      occupancyLineHeight: 8,
      occupancyFont: {
        widthOfTextAtSize: (_text: string, size: number) => 40 * (size / 8),
      } as never,
      labelSize: 9,
      occupancySize: 8,
    });

    assert.equal(Math.round((layout.labelCenter.x + layout.occupancyCenter.x) / 2), centerX);
    assert.equal(Math.round((layout.labelCenter.y + layout.occupancyCenter.y) / 2), centerY);
    if (rotation === 270) {
      assert.equal(layout.textRotationDegrees, 90);
    }
  }
});

test("overview text layout enforces non-overlap center spacing", () => {
  const layout = getRotatedOverviewTextLayout({
    centerX: 100,
    centerY: 100,
    rotationDegrees: 90,
    tableShortSide: 60,
    labelWidth: 64,
    occupancyWidth: 36,
    occupancyText: "2/2",
    labelLineHeight: 9,
    occupancyLineHeight: 8,
    occupancyFont: {
      widthOfTextAtSize: (_text: string, size: number) => 36 * (size / 8),
    } as never,
    labelSize: 9,
    occupancySize: 8,
  });

  const dx = layout.labelCenter.x - layout.occupancyCenter.x;
  const dy = layout.labelCenter.y - layout.occupancyCenter.y;
  const centerDistance = Math.sqrt(dx * dx + dy * dy);
  const minAllowedDistance =
    layout.labelLineHeight / 2 + layout.occupancyLineHeight / 2 + 1;

  assert.equal(centerDistance >= minAllowedDistance, true);
  assert.equal(layout.effectiveGap >= 1, true);
});

test("baseline correction follows rotated normal axis (not world Y)", () => {
  const layout = getRotatedOverviewTextLayout({
    centerX: 100,
    centerY: 100,
    rotationDegrees: 90,
    tableShortSide: 80,
    labelWidth: 60,
    occupancyWidth: 32,
    occupancyText: "2/2",
    labelLineHeight: 10,
    occupancyLineHeight: 8,
    occupancyFont: {
      widthOfTextAtSize: (_text: string, size: number) => 32 * (size / 8),
    } as never,
    labelSize: 9,
    occupancySize: 8,
  });

  const correctionVector = {
    x: layout.labelCenter.x - layout.labelOrigin.x,
    y: layout.labelCenter.y - layout.labelOrigin.y,
  };
  // For 90°, the normal axis points to negative X, so X correction should dominate.
  assert.equal(Math.abs(correctionVector.x) > Math.abs(correctionVector.y), true);
});
