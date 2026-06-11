import assert from "node:assert/strict";
import test from "node:test";

import { getVendorPaymentSummary } from "./vendor-payment-summary";

test("derives paid and remaining amounts from linked paid payments only", () => {
  assert.deepEqual(
    getVendorPaymentSummary({
      totalCostMinor: 10_000,
      paymentStatus: "not_started",
      expenses: [
        { amountMinor: 2_000, status: "paid" },
        { amountMinor: 3_000, status: "planned" },
        { amountMinor: 1_000, status: "reimbursed" },
      ],
    }),
    {
      amountPaidMinor: 2_000,
      depositPaidMinor: 0,
      remainingMinor: 8_000,
      paymentStatus: "partial",
    },
  );
});

test("derives deposits from linked paid deposit payments", () => {
  assert.equal(
    getVendorPaymentSummary({
      totalCostMinor: 10_000,
      paymentStatus: "not_started",
      expenses: [
        { amountMinor: 2_000, category: "Deposit", status: "paid" },
        { amountMinor: 1_000, category: "Deposit", status: "planned" },
        { amountMinor: 3_000, category: "Other", status: "paid" },
      ],
    }).depositPaidMinor,
    2_000,
  );
});

test("preserves canceled vendors and marks fully paid contracts", () => {
  assert.equal(
    getVendorPaymentSummary({
      totalCostMinor: 5_000,
      paymentStatus: "not_started",
      expenses: [{ amountMinor: 5_000, status: "paid" }],
    }).paymentStatus,
    "paid",
  );
  assert.equal(
    getVendorPaymentSummary({
      totalCostMinor: 5_000,
      paymentStatus: "not_started",
      lifecycleStatus: "canceled",
      expenses: [{ amountMinor: 5_000, status: "paid" }],
    }).paymentStatus,
    "canceled",
  );
});
