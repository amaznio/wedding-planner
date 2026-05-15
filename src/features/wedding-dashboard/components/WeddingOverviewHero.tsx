"use client";

import { MapPin, UsersRound, Wallet } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Locale } from "@/i18n/config";
import type { WeddingOverviewData } from "../types";
import { formatCurrencyMinor, formatDate, getCountdownDays } from "../lib/formatting";

type WeddingOverviewHeroProps = {
  overview: WeddingOverviewData;
  locale: Locale;
  onOpenDetails: () => void;
};

export function WeddingOverviewHero({ overview, locale, onOpenDetails }: WeddingOverviewHeroProps) {
  const { t } = useI18n();

  const spentPercent = overview.budgetMinor > 0
    ? Math.min(100, Math.round((overview.spentMinor / overview.budgetMinor) * 100))
    : 0;

  return (
    <Card className="overflow-hidden border-zinc-200/80 bg-white py-0">
      <CardContent className="p-0">
        <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
          <div className="relative min-h-[220px] overflow-hidden bg-gradient-to-br from-rose-100 via-amber-50 to-violet-100 md:w-[280px] md:flex-none md:self-stretch md:min-h-0">
            {overview.coverImageUrl ? (
              <Image
                src={overview.coverImageUrl}
                alt={overview.coupleNames}
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_50%)]" />
            )}
            <div className="absolute bottom-4 left-4 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700">
              {t("dashboard.overview.heroTag")}
            </div>
          </div>

          <div className="flex-1 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold text-zinc-900">{overview.coupleNames}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatDate(overview.weddingDate, locale)} · {t("dashboard.overview.countdown", { count: getCountdownDays(overview.weddingDate) })}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={onOpenDetails}>
                {t("dashboard.overview.details")}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="mb-1 flex items-center gap-1 text-zinc-500"><MapPin className="size-4" />{t("dashboard.overview.venue")}</p>
                <p className="font-medium text-zinc-900">{overview.venue}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="mb-1 flex items-center gap-1 text-zinc-500"><UsersRound className="size-4" />{t("dashboard.overview.guestEstimate")}</p>
                <p className="font-medium text-zinc-900">{t("dashboard.overview.guestsCount", { count: overview.guestEstimate })}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
                <p className="mb-1 flex items-center gap-1 text-zinc-500"><Wallet className="size-4" />{t("dashboard.overview.totalBudget")}</p>
                <p className="font-medium text-zinc-900">{formatCurrencyMinor(overview.budgetMinor, overview.currency, locale)}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="text-zinc-700">{t("dashboard.overview.spent")}</p>
                <p className="font-medium text-zinc-900">
                  {formatCurrencyMinor(overview.spentMinor, overview.currency, locale)} / {formatCurrencyMinor(overview.budgetMinor, overview.currency, locale)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={spentPercent} className="h-2.5" />
                <span className="text-sm font-semibold text-zinc-700">{spentPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
