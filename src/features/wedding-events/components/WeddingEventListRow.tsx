"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeddingEventListItem } from "@/features/wedding-events/lib/map-wedding-event-list-item";

type WeddingEventListRowProps = {
  event: WeddingEventListItem;
  href: string;
  guestsLabel: string;
  confirmedLabel: string;
  confirmedRatioLabel: string;
  openLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit?: () => void;
  highlighted?: boolean;
};

export function WeddingEventListRow({
  event,
  href,
  guestsLabel,
  confirmedLabel,
  confirmedRatioLabel,
  openLabel,
  editLabel,
  deleteLabel,
  onEdit,
  highlighted = false,
}: WeddingEventListRowProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-colors",
        highlighted ? "border-violet-300 bg-violet-50/30" : "border-zinc-200 hover:bg-zinc-50",
      )}
    >
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 md:grid-cols-[56px_minmax(0,1fr)_92px_120px_32px] md:items-center md:gap-4">
        <Link href={href} className="block rounded-lg bg-violet-50 px-1 py-2 text-center">
          <div className="text-2xl font-semibold leading-none text-violet-700">{event.dayLabel}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-violet-500">{event.monthLabel}</div>
          <div className="text-[10px] text-zinc-500">{event.yearLabel}</div>
        </Link>

        <Link href={href} className="min-w-0">
          <div className="truncate text-xl font-semibold text-zinc-900 md:text-lg">{event.name}</div>
          <div className="mt-1 truncate text-sm text-zinc-600">{event.displayDateTime}</div>
          <div className="mt-1 truncate text-sm text-zinc-700">{event.location ?? "-"}</div>
        </Link>

        <div className="mt-2 md:mt-0">
          <div className="text-2xl font-semibold leading-none text-zinc-900 md:text-xl">{event.guestCount}</div>
          <div className="mt-1 text-xs text-zinc-600">{guestsLabel}</div>
        </div>

        <div className="mt-2 md:mt-0">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{confirmedLabel}</Badge>
          <div className="mt-1 text-xs text-zinc-700">
            {confirmedRatioLabel}
          </div>
        </div>

        <div className="mt-2 flex justify-end md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={openLabel}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={href}>{openLabel}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  onEdit?.();
                }}
                disabled={!onEdit}
              >
                {editLabel}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>{deleteLabel}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
