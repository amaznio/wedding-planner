import assert from "node:assert/strict";
import test from "node:test";

import { buildVendorDepositPayment } from "./vendor-deposit-payment";

test("builds a linked paid deposit payment", () => {
  assert.deepEqual(
    buildVendorDepositPayment({
      weddingId: "wedding-1",
      vendorId: "vendor-1",
      vendorName: "Paradise Moments Studio",
      amountMinor: 2_000,
      currency: "pln",
    }),
    {
      weddingId: "wedding-1",
      vendorId: "vendor-1",
      title: "Paradise Moments Studio",
      category: "Deposit",
      amountMinor: 2_000,
      currency: "PLN",
      status: "paid",
    },
  );
});

test("does not build a payment for a zero deposit", () => {
  assert.equal(
    buildVendorDepositPayment({
      weddingId: "wedding-1",
      vendorId: "vendor-1",
      vendorName: "Paradise Moments Studio",
      amountMinor: 0,
      currency: "PLN",
    }),
    null,
  );
});
