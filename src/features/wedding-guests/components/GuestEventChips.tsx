import { Church, GlassWater, Heart, Music, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";
import type { WeddingGuestEvent } from "../types";

type GuestEventChipsProps = {
  events: WeddingGuestEvent[];
};

const eventConfig: Record<WeddingGuestEvent, { icon: typeof Heart; className: string }> = {
  wedding: { icon: Heart, className: "bg-amber-100 text-amber-700" },
  ceremony: { icon: Church, className: "bg-sky-100 text-sky-700" },
  afterparty: { icon: Music, className: "bg-indigo-100 text-indigo-700" },
  bachelorette: { icon: PartyPopper, className: "bg-violet-100 text-violet-700" },
  bachelor: { icon: GlassWater, className: "bg-emerald-100 text-emerald-700" },
};

export function GuestEventChips({ events }: GuestEventChipsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {events.map((event) => {
        const { icon: Icon, className } = eventConfig[event];
        return (
          <span
            key={event}
            className={cn("inline-flex size-7 items-center justify-center rounded-full", className)}
            title={t(`weddingGuestsPage.events.${event}`)}
            aria-label={t(`weddingGuestsPage.events.${event}`)}
          >
            <Icon className="size-4" />
          </span>
        );
      })}
    </div>
  );
}

