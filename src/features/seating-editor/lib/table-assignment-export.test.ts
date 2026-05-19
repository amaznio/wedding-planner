import assert from "node:assert/strict";
import test from "node:test";

import { formatTableAssignmentsExport } from "./table-assignment-export";

test("orders tables by label and guests by seat number", () => {
  const result = formatTableAssignmentsExport(
    [
      { id: "table-b", label: "Table B" },
      { id: "table-a", label: "Table A" },
    ],
    [
      { name: "Guest 3", assignment: { tableId: "table-b", seatNumber: 2 } },
      { name: "Guest 2", assignment: { tableId: "table-a", seatNumber: 2 } },
      { name: "Guest 1", assignment: { tableId: "table-a", seatNumber: 1 } },
    ],
    "en",
  );

  assert.equal(
    result,
    ["Table A", "----------", "Guest 1", "Guest 2", "", "Table B", "----------", "Guest 3"].join("\n"),
  );
});

test("excludes unassigned guests", () => {
  const result = formatTableAssignmentsExport(
    [{ id: "table-a", label: "Table A" }],
    [
      { name: "Seated Guest", assignment: { tableId: "table-a", seatNumber: 1 } },
      { name: "Unassigned Guest", assignment: null },
    ],
    "en",
  );

  assert.equal(result.includes("Unassigned Guest"), false);
  assert.equal(result.includes("Seated Guest"), true);
});

test("handles tables with no assigned guests", () => {
  const result = formatTableAssignmentsExport([{ id: "table-a", label: "Table A" }], [], "en");

  assert.equal(result, ["Table A", "----------"].join("\n"));
});
