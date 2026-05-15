import { Check, Hourglass, Users, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { WeddingGuestStats } from "../types";

type GuestStatsCardsProps = {
  stats: WeddingGuestStats;
  shares: {
    confirmed: number;
    pending: number;
    notAttending: number;
    noResponse: number;
  };
  isLoading: boolean;
};

export function GuestStatsCards({ stats, shares, isLoading }: GuestStatsCardsProps) {
  const { t } = useI18n();

  const items = [
    {
      id: "total",
      icon: Users,
      value: stats.totalGuests,
      title: t("weddingGuestsPage.stats.total.title"),
      subtitle: t("weddingGuestsPage.stats.total.subtitle", { count: stats.deltaSinceUpdate }),
      iconClassName: "bg-violet-100 text-violet-600",
    },
    {
      id: "confirmed",
      icon: Check,
      value: stats.confirmed,
      title: t("weddingGuestsPage.stats.confirmed.title"),
      subtitle: t("weddingGuestsPage.stats.confirmed.subtitle", { percent: shares.confirmed }),
      iconClassName: "bg-emerald-100 text-emerald-600",
    },
    {
      id: "pending",
      icon: Hourglass,
      value: stats.pending,
      title: t("weddingGuestsPage.stats.pending.title"),
      subtitle: t("weddingGuestsPage.stats.pending.subtitle", { percent: shares.pending }),
      iconClassName: "bg-amber-100 text-amber-600",
    },
    {
      id: "notAttending",
      icon: X,
      value: stats.notAttending,
      title: t("weddingGuestsPage.stats.notAttending.title"),
      subtitle: t("weddingGuestsPage.stats.notAttending.subtitle", { percent: shares.notAttending }),
      iconClassName: "bg-red-100 text-red-600",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.id} className="gap-0 py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className={`flex size-12 items-center justify-center rounded-full ${item.iconClassName}`}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-semibold text-zinc-900">{isLoading ? "..." : item.value}</p>
                <p className="text-sm font-medium text-zinc-800">{item.title}</p>
                <p className="text-xs text-zinc-500">{isLoading ? t("common.loading") : item.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
