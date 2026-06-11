type VendorDepositPaymentInput = {
  weddingId: string;
  vendorId: string;
  vendorName: string;
  amountMinor: number;
  currency: string;
};

export function buildVendorDepositPayment(input: VendorDepositPaymentInput) {
  if (input.amountMinor <= 0) return null;

  return {
    weddingId: input.weddingId,
    vendorId: input.vendorId,
    title: input.vendorName,
    category: "Deposit",
    amountMinor: input.amountMinor,
    currency: input.currency.toUpperCase(),
    status: "paid" as const,
  };
}
