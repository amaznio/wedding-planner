import assert from "node:assert/strict";
import test from "node:test";

import { deriveTaskStatusFromChecklist, normalizeTaskGroupName } from "./task-rules";

test("normalizes task group names for wedding-scoped uniqueness", () => {
  assert.equal(normalizeTaskGroupName("  Venue   Setup  "), "venue setup");
});

test("derives task status from checklist completion", () => {
  assert.equal(deriveTaskStatusFromChecklist(0, 0), "todo");
  assert.equal(deriveTaskStatusFromChecklist(3, 0), "todo");
  assert.equal(deriveTaskStatusFromChecklist(3, 1), "in_progress");
  assert.equal(deriveTaskStatusFromChecklist(3, 3), "done");
});
