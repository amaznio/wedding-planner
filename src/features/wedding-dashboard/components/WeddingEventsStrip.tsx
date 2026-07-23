"use client";

import Link from "next/link";
import { CalendarPlus2, Church, GlassWater, Martini, PartyPopper, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Locale } from "@/i18n/config";
import type { DashboardEventCard } from "../types";
import { formatShortDate } from "../lib/formatting";

type WeddingEventsStripProps = {
  events: DashboardEventCard[];
  locale: Locale;
  onAddEvent: () => void;
};

const iconByType = {
  wedding: PartyPopper,
  ceremony: Church,
  afterparty: GlassWater,
  bachelorette: Sparkles,
  bachelor: Martini,
  other: Sparkles,
} as const;

export function WeddingEventsStrip({ events, locale, onAddEvent }: WeddingEventsStripProps) {
  const { t } = useI18n();

  return (
    <section>
      <ScrollArea>
        <div className="flex gap-3 pb-2">
          {events.map((event) => {
            const Icon = iconByType[event.type] ?? Sparkles;
            const cardClass = cn(
              "flex min-w-[170px] flex-col rounded-xl border bg-white p-4 text-left transition-colors hover:bg-zinc-50",
              event.status === "active" ? "border-violet-300" : "border-zinc-200",
            );

            if (event.href) {
              return (
                <Link key={event.id} href={event.href} className={cardClass}>
                  <Icon className="mb-3 size-4 text-violet-600" />
                  <p className="text-sm font-semibold text-zinc-900">{event.name}</p>
                  <p className="text-xs text-zinc-600">{formatShortDate(event.date, locale)}</p>
                </Link>
              );
            }

            return (
              <Card key={event.id} className={cardClass}>
                <CardContent className="p-0">
                  <Icon className="mb-3 size-4 text-violet-600" />
                  <p className="text-sm font-semibold text-zinc-900">{event.name}</p>
                  <p className="text-xs text-zinc-600">{formatShortDate(event.date, locale)}</p>
                </CardContent>
              </Card>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="min-h-[112px] min-w-[170px] border-dashed text-zinc-600"
            onClick={onAddEvent}
          >
            <CalendarPlus2 className="size-4" />
            {t("dashboard.events.addEvent")}
          </Button>
        </div>
      </ScrollArea>
    </section>
  );
}
