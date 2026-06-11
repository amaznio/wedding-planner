type PaymentStatus = "planned" | "committed" | "paid" | "reimbursed" | "canceled";
type VendorPaymentStatus = "not_started" | "partial" | "paid" | "canceled";
type VendorLifecycleStatus = "considering" | "booked" | "contract_signed" | "canceled";

type VendorPaymentInput = {
  amountMinor: number;
  category?: string;
  status: PaymentStatus;
};

type VendorFinancialInput = {
  totalCostMinor: number;
  paymentStatus: VendorPaymentStatus;
  lifecycleStatus?: VendorLifecycleStatus;
  expenses: VendorPaymentInput[];
};

export function getVendorPaymentSummary(vendor: VendorFinancialInput) {
  const amountPaidMinor = vendor.expenses
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountMinor, 0);
  const depositPaidMinor = vendor.expenses
    .filter((payment) => payment.status === "paid" && payment.category === "Deposit")
    .reduce((sum, payment) => sum + payment.amountMinor, 0);
  const remainingMinor = Math.max(0, vendor.totalCostMinor - amountPaidMinor);

  let paymentStatus: VendorPaymentStatus = "not_started";
  if (vendor.lifecycleStatus === "canceled" || (!vendor.lifecycleStatus && vendor.paymentStatus === "canceled")) {
    paymentStatus = "canceled";
  } else if (vendor.totalCostMinor > 0 && amountPaidMinor >= vendor.totalCostMinor) {
    paymentStatus = "paid";
  } else if (amountPaidMinor > 0) {
    paymentStatus = "partial";
  }

  return {
    amountPaidMinor,
    depositPaidMinor,
    remainingMinor,
    paymentStatus,
  };
}
