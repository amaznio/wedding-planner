import assert from "node:assert/strict";
import test from "node:test";

import { buildDashboardMockData } from "./dashboard.mock";

test("builds vendor progress from secured and active lifecycle counts", () => {
  const data = buildDashboardMockData({
    weddingId: "wedding-1",
    weddingName: "Wedding",
    activeVendorCount: 3,
    securedVendorCount: 2,
  });
  const vendors = data.planningProgress.find((row) => row.id === "vendors");

  assert.equal(vendors?.progress, 67);
  assert.equal(vendors?.detailLabel, "2 / 3");
});

test("shows zero vendor progress when there are no active vendors", () => {
  const data = buildDashboardMockData({
    weddingId: "wedding-1",
    weddingName: "Wedding",
    activeVendorCount: 0,
    securedVendorCount: 0,
  });
  const vendors = data.planningProgress.find((row) => row.id === "vendors");

  assert.equal(vendors?.progress, 0);
  assert.equal(vendors?.detailLabel, "0 / 0");
});
