"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, FileText, ListChecks, Users, Wallet, CalendarClock, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { PlanningProgressRow } from "../types";

type PlanningProgressRowProps = {
  row: PlanningProgressRow;
  title: string;
  description: string;
  detailLabel: string;
  progressLabel?: string;
  onPlaceholderAction: (id: string) => void;
};

const iconById = {
  guestList: Users,
  eventGuests: PartyPopper,
  budgetExpenses: Wallet,
  vendors: CircleCheck,
  schedule: CalendarClock,
  notesIdeas: ListChecks,
  documents: FileText,
} as const;

const accentById = {
  guestList: "text-violet-600 bg-violet-100",
  eventGuests: "text-amber-600 bg-amber-100",
  budgetExpenses: "text-green-600 bg-green-100",
  vendors: "text-emerald-600 bg-emerald-100",
  schedule: "text-orange-600 bg-orange-100",
  notesIdeas: "text-pink-600 bg-pink-100",
  documents: "text-blue-600 bg-blue-100",
} as const;

function RowBody({
  row,
  title,
  description,
  detailLabel,
  progressLabel,
}: Omit<PlanningProgressRowProps, "onPlaceholderAction">) {
  const Icon = iconById[row.id];

  return (
    <div className="flex items-center gap-3 p-4">
      <div className={cn("flex size-9 items-center justify-center rounded-full", accentById[row.id])}>
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-600">{description}</p>
      </div>

      <div className="w-40 shrink-0 text-right">
        {row.progress !== null ? (
          <>
            <p className="text-sm font-semibold text-zinc-900">{progressLabel}</p>
            <Progress value={row.progress} className="mt-1.5 h-2" />
          </>
        ) : null}
      </div>

      <div className="w-32 shrink-0 text-right text-xs text-zinc-600">{detailLabel}</div>
      <ChevronRight className="size-4 shrink-0 text-zinc-400" />
    </div>
  );
}

export function PlanningProgressRowItem({
  row,
  title,
  description,
  detailLabel,
  progressLabel,
  onPlaceholderAction,
}: PlanningProgressRowProps) {
  if (row.href) {
    return (
      <Link href={row.href} className="block border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50">
        <RowBody
          row={row}
          title={title}
          description={description}
          detailLabel={detailLabel}
          progressLabel={progressLabel}
        />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPlaceholderAction(row.id)}
      className="block w-full border-b border-zinc-200 text-left last:border-b-0 hover:bg-zinc-50"
    >
      <RowBody
        row={row}
        title={title}
        description={description}
        detailLabel={detailLabel}
        progressLabel={progressLabel}
      />
    </button>
  );
}
