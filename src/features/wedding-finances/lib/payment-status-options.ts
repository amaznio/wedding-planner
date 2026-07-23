export const expenseStatusValues = ["planned", "committed", "paid", "reimbursed", "canceled"] as const;

export type ExpenseStatus = (typeof expenseStatusValues)[number];
