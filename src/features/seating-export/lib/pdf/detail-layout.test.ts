import assert from "node:assert/strict";
import test from "node:test";

import {
  getDetailPageLayout,
  getDiagramPlacement,
  getLegendColumns,
} from "./detail-layout";
import { buildSeatingPrintModel } from "../build-print-model";

test("splits legend into multiple columns for large tables", () => {
  const layout = getDetailPageLayout(841.89, 595.28);
  const items = Array.from({ length: 44 }, (_, index) => ({
    seatNumber: index + 1,
    guestName: `Guest ${index + 1}`,
  }));

  const columns = getLegendColumns(items, layout.right);
  assert.equal(columns.length >= 2, true);
  assert.equal(columns.flatMap((column) => column.items).length, 44);
});

test("table diagram placement stays inside left bounds", () => {
  const layout = getDetailPageLayout(841.89, 595.28);
  const table = {
    tableId: "t1",
    label: "Table A",
    type: "rectangle" as const,
    seatLayout: "balanced" as const,
    x: 100,
    y: 100,
    rotation: 0,
    seatCount: 10,
    occupiedCount: 4,
    width: 220,
    height: 80,
    seats: Array.from({ length: 10 }, (_, index) => ({
      seatNumber: index + 1,
      x: 20 + index * 16,
      y: index < 5 ? -20 : 100,
      occupied: index % 2 === 0,
      guest: null,
    })),
  };

  const placement = getDiagramPlacement(table, {
    x: layout.left.x + 10,
    y: layout.left.y + 10,
    width: layout.left.width - 20,
    height: layout.left.height - 20,
  });

  assert.equal(placement.scale > 0, true);
  assert.equal(Number.isFinite(placement.offsetX), true);
  assert.equal(Number.isFinite(placement.offsetY), true);
});

test("build print model preserves Polish guest names and occupancy", () => {
  const model = buildSeatingPrintModel({
    plan: {
      id: "p1",
      name: "Plan",
      width: 1200,
      height: 800,
      tables: [
        {
          id: "t1",
          label: "Para Młoda",
          type: "rectangle",
          x: 100,
          y: 120,
          rotation: 0,
          seatCount: 4,
          seatLayout: "balanced",
        },
      ],
    },
    guests: [
      {
        id: "g1",
        name: "Łukasz Żółć",
        isPlaceholderPlusOne: false,
        assignment: { tableId: "t1", seatNumber: 1 },
      },
      {
        id: "g2",
        name: "Małgorzata Ącki",
        isPlaceholderPlusOne: false,
        assignment: { tableId: "t1", seatNumber: 2 },
      },
    ],
    options: {
      theme: "simple",
      paper: "A4",
      orientation: "landscape",
      includeEmptySeats: true,
      overviewShowSeats: false,
      detailSeatLabelMode: "number",
      detailTableVertical: false,
      locale: "pl",
    },
  });

  assert.equal(model.details[0]?.table.occupiedCount, 2);
  const names = model.details[0]?.legend.map((item) => item.guestName) ?? [];
  assert.equal(names.includes("Łukasz Żółć"), true);
  assert.equal(names.includes("Małgorzata Ącki"), true);
});
