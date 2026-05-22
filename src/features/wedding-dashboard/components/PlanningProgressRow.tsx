"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, FileText, ListChecks, Users, Wallet, CalendarClock, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-4 sm:flex-nowrap">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", accentById[row.id])}>
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-600">{description}</p>
      </div>

      {row.progress !== null ? (
        <div className="order-3 ml-12 w-full text-left sm:order-none sm:ml-0 sm:w-40 sm:shrink-0 sm:text-right">
          <p className="text-sm font-semibold text-zinc-900">{progressLabel}</p>
          <Progress value={row.progress} className="mt-1.5 h-2" />
        </div>
      ) : (
        <div className="hidden sm:block sm:w-40 sm:shrink-0" aria-hidden="true" />
      )}

      <div className="order-4 ml-12 w-full text-xs text-zinc-600 sm:order-none sm:ml-0 sm:w-36 sm:shrink-0 sm:text-right">{detailLabel}</div>
      <ChevronRight className="order-2 ml-auto size-4 shrink-0 text-zinc-400 sm:order-none sm:ml-0" />
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
    <Button
      type="button"
      variant="ghost"
      onClick={() => onPlaceholderAction(row.id)}
      className="flex h-auto w-full items-stretch justify-start whitespace-normal rounded-none border-b border-zinc-200 p-0 text-left font-normal hover:bg-zinc-50 last:border-b-0"
    >
      <RowBody
        row={row}
        title={title}
        description={description}
        detailLabel={detailLabel}
        progressLabel={progressLabel}
      />
    </Button>
  );
}
