import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeNoteCategory,
  cleanNoteCategory,
  getCanonicalNoteCategories,
  normalizeNoteCategory,
} from "./note-categories";

test("cleans and normalizes category spacing and casing", () => {
  assert.equal(cleanNoteCategory("  Wedding   venue  "), "Wedding venue");
  assert.equal(normalizeNoteCategory("  PHOTOgrapher "), "photographer");
});

test("keeps the oldest spelling and sorts canonical categories", () => {
  assert.deepEqual(
    getCanonicalNoteCategories(["Photographer", " photographer ", "Venue", "WEDDING   venue", null]),
    ["Photographer", "Venue", "WEDDING venue"],
  );
});

test("reuses an existing canonical category or cleans a new category", () => {
  const existing = ["Photographer", "Wedding venue"];

  assert.equal(canonicalizeNoteCategory(" photographer ", existing), "Photographer");
  assert.equal(canonicalizeNoteCategory("Wedding   venue", existing), "Wedding venue");
  assert.equal(canonicalizeNoteCategory("  Music  ", existing), "Music");
  assert.equal(canonicalizeNoteCategory("   ", existing), null);
  assert.equal(canonicalizeNoteCategory(undefined, existing), undefined);
});
