import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { WeddingGuestStats } from "../types";

type GuestSummaryCardProps = {
  stats: WeddingGuestStats;
  shares: {
    confirmed: number;
    pending: number;
    notAttending: number;
    noResponse: number;
  };
  isLoading: boolean;
};

export function GuestSummaryCard({ stats, shares, isLoading }: GuestSummaryCardProps) {
  const { t } = useI18n();

  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="text-lg">{t("weddingGuestsPage.insights.summary.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex items-center justify-center gap-4">
          <div
            className="relative flex size-36 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(
                #22c55e 0 ${shares.confirmed}%,
                #fbbf24 ${shares.confirmed}% ${shares.confirmed + shares.pending}%,
                #f43f5e ${shares.confirmed + shares.pending}% ${shares.confirmed + shares.pending + shares.notAttending}%,
                #d4d4d8 ${shares.confirmed + shares.pending + shares.notAttending}% 100%
              )`,
            }}
          >
            <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white text-center">
              <p className="text-3xl font-semibold text-zinc-900">{isLoading ? "..." : stats.totalGuests}</p>
              <p className="text-sm text-zinc-600">{t("weddingGuestsPage.insights.summary.guestsLabel")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <SummaryRow colorClassName="bg-emerald-500" label={t("weddingGuestsPage.status.confirmed")} value={isLoading ? "..." : stats.confirmed} percent={isLoading ? "..." : `${shares.confirmed}%`} />
          <SummaryRow colorClassName="bg-amber-400" label={t("weddingGuestsPage.status.pending")} value={isLoading ? "..." : stats.pending} percent={isLoading ? "..." : `${shares.pending}%`} />
          <SummaryRow colorClassName="bg-rose-500" label={t("weddingGuestsPage.status.not_attending")} value={isLoading ? "..." : stats.notAttending} percent={isLoading ? "..." : `${shares.notAttending}%`} />
          <SummaryRow colorClassName="bg-zinc-400" label={t("weddingGuestsPage.status.no_response")} value={isLoading ? "..." : stats.noResponse} percent={isLoading ? "..." : `${shares.noResponse}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  colorClassName,
  label,
  value,
  percent,
}: {
  colorClassName: string;
  label: string;
  value: number | string;
  percent: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${colorClassName}`} />
        <span className="text-zinc-700">{label}</span>
      </div>
      <span className="text-zinc-500">
        {value} ({percent})
      </span>
    </div>
  );
}
