"use client";

import {
  CalendarClock,
  CircleDollarSign,
  CircleX,
  FileCheck2,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

import type { ExpenseStatus } from "@/features/wedding-finances/lib/payment-status-options";

const paymentStatusIcons: Record<ExpenseStatus, LucideIcon> = {
  planned: CalendarClock,
  committed: FileCheck2,
  paid: CircleDollarSign,
  reimbursed: RotateCcw,
  canceled: CircleX,
};

export function PaymentStatusOption({ status, label }: { status: ExpenseStatus; label: string }) {
  const Icon = paymentStatusIcons[status];

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 text-zinc-500" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
