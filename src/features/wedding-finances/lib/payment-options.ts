export const vendorPaymentCategoryValues = [
  "Deposit",
  "FinalPayment",
  "Installment",
  "AdditionalFee",
  "Refund",
  "Adjustment",
] as const;

export const weddingExpenseCategoryValues = [
  "Ceremony",
  "Reception",
  "Decor",
  "Attire",
  "Beauty",
  "Stationery",
  "Rings",
  "Transport",
  "Accommodation",
  "LegalFees",
  "Gifts",
  "Tips",
  "Other",
] as const;

export const paymentCategoryValues = [
  ...vendorPaymentCategoryValues,
  ...weddingExpenseCategoryValues,
] as const;

export const paidByValues = [
  "Couple",
  "Bride",
  "Groom",
  "BrideParents",
  "GroomParents",
  "Parents",
  "OtherPerson",
] as const;

export type PaymentCategory = (typeof paymentCategoryValues)[number];
export type PaidByOption = (typeof paidByValues)[number];

export function isKnownPaymentCategory(value: string): value is PaymentCategory {
  return paymentCategoryValues.includes(value as PaymentCategory);
}

export function isKnownPaidByOption(value: string): value is PaidByOption {
  return paidByValues.includes(value as PaidByOption);
}

export function getPaymentCategoryLabel(value: string, t: (key: string) => string): string {
  return isKnownPaymentCategory(value) ? t(`budget.page.categories.${value}`) : value;
}

export function getPaidByLabel(value: string, t: (key: string) => string): string {
  return isKnownPaidByOption(value) ? t(`budget.page.paidBy.${value}`) : value;
}
