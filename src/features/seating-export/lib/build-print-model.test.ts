import assert from "node:assert/strict";
import test from "node:test";

import { buildSeatingPrintModel } from "./build-print-model";

test("builds detail legends ordered by seat number", () => {
  const model = buildSeatingPrintModel({
    plan: {
      id: "p1",
      name: "Plan",
      width: 1400,
      height: 900,
      tables: [
        {
          id: "t1",
          label: "Table A",
          type: "rectangle",
          x: 120,
          y: 140,
          rotation: 0,
          seatCount: 6,
          seatLayout: "balanced",
        },
      ],
    },
    guests: [
      { id: "g1", name: "Anna", isPlaceholderPlusOne: false, assignment: { tableId: "t1", seatNumber: 2 } },
      { id: "g2", name: "Bob", isPlaceholderPlusOne: false, assignment: { tableId: "t1", seatNumber: 1 } },
    ],
    options: {
      theme: "simple",
      paper: "A4",
      orientation: "landscape",
      includeEmptySeats: false,
      overviewShowSeats: false,
      detailSeatLabelMode: "number",
      detailTableVertical: false,
      locale: "en",
    },
  });

  assert.equal(model.details.length, 1);
  assert.deepEqual(model.details[0]?.legend.map((item) => item.seatNumber), [1, 2]);
  assert.deepEqual(model.details[0]?.legend.map((item) => item.guestName), ["Bob", "Anna"]);
});

test("keeps overview transform within positive bounds", () => {
  const model = buildSeatingPrintModel({
    plan: {
      id: "p2",
      name: "Plan",
      width: 2000,
      height: 1200,
      tables: [
        {
          id: "t1",
          label: "A",
          type: "rectangle",
          x: 100,
          y: 100,
          rotation: 0,
          seatCount: 8,
          seatLayout: "balanced",
        },
        {
          id: "t2",
          label: "B",
          type: "rectangle",
          x: 1500,
          y: 900,
          rotation: 0,
          seatCount: 8,
          seatLayout: "balanced",
        },
      ],
    },
    guests: [],
    options: {
      theme: "simple",
      paper: "A4",
      orientation: "landscape",
      includeEmptySeats: true,
      overviewShowSeats: false,
      detailSeatLabelMode: "number",
      detailTableVertical: false,
      locale: "en",
    },
  });

  assert.equal(model.overview.scale > 0, true);
  assert.equal(Number.isFinite(model.overview.offsetX), true);
  assert.equal(Number.isFinite(model.overview.offsetY), true);
});

test("stores rotation-aware overview geometry for tables", () => {
  const model = buildSeatingPrintModel({
    plan: {
      id: "p3",
      name: "Plan",
      width: 1400,
      height: 900,
      tables: [
        {
          id: "t-rot",
          label: "Para Mloda",
          type: "rectangle",
          x: 300,
          y: 220,
          rotation: 90,
          seatCount: 2,
          seatLayout: "balanced",
        },
      ],
    },
    guests: [],
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

  const table = model.overview.tables[0];
  assert.ok(table);
  assert.ok(table?.overviewCenter);
  assert.ok(table?.overviewAabb);
  assert.equal(table?.overviewCorners?.length, 4);
  assert.equal((table?.overviewAabb?.maxY ?? 0) > (table?.overviewAabb?.minY ?? 0), true);
});

test("rotation-aware bounds change overview fit versus unrotated extents", () => {
  const model = buildSeatingPrintModel({
    plan: {
      id: "p4",
      name: "Plan",
      width: 1600,
      height: 1000,
      tables: [
        {
          id: "small-rotated",
          label: "Para Mloda",
          type: "rectangle",
          x: 120,
          y: 120,
          rotation: 90,
          seatCount: 2,
          seatLayout: "balanced",
        },
        {
          id: "long",
          label: "Stol 1",
          type: "rectangle",
          x: 300,
          y: 120,
          rotation: 0,
          seatCount: 42,
          seatLayout: "balanced",
        },
      ],
    },
    guests: [],
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

  assert.equal(model.overview.scale > 0, true);
  const rotatedTable = model.overview.tables.find((table) => table.tableId === "small-rotated");
  assert.ok(rotatedTable?.overviewAabb);
  if (!rotatedTable?.overviewAabb) {
    throw new Error("Rotated table overview geometry missing");
  }
  assert.ok(
    rotatedTable.overviewAabb.maxX - rotatedTable.overviewAabb.minX <
      rotatedTable.width,
  );
});
