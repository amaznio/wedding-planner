import { AppStatsRail } from "@/components/app/AppStatsRail";
import { useI18n } from "@/i18n/provider";
import type { WeddingGuestStats } from "../types";

type GuestStatsCardsProps = {
  stats: WeddingGuestStats;
  isLoading: boolean;
};

export function GuestStatsCards({ stats, isLoading }: GuestStatsCardsProps) {
  const { t } = useI18n();

  const items = [
    {
      id: "total",
      value: stats.totalGuests,
      title: t("weddingGuestsPage.stats.total.title"),
    },
    {
      id: "confirmed",
      value: stats.confirmed,
      title: t("weddingGuestsPage.stats.confirmed.title"),
    },
    {
      id: "pending",
      value: stats.pending,
      title: t("weddingGuestsPage.stats.pending.title"),
    },
    {
      id: "notAttending",
      value: stats.notAttending,
      title: t("weddingGuestsPage.stats.notAttending.title"),
    },
  ];

  return <AppStatsRail items={items.map((item) => ({ label: item.title, value: isLoading ? "..." : item.value }))} />;
}
