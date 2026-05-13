"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import type { PlanningProgressRow, WeddingOverviewData } from "../types";
import { formatCurrencyMinor } from "../lib/formatting";
import { PlanningProgressRowItem } from "./PlanningProgressRow";

type PlanningProgressSectionProps = {
  rows: PlanningProgressRow[];
  overview: WeddingOverviewData;
  notesCount: number;
  documentsCount: number;
  locale: Locale;
  onPlaceholderAction: (id: string) => void;
};

export function PlanningProgressSection({
  rows,
  overview,
  notesCount,
  documentsCount,
  locale,
  onPlaceholderAction,
}: PlanningProgressSectionProps) {
  const { t } = useI18n();

  return (
    <section>
      <Card className="border-zinc-200/80 bg-white">
        <CardHeader className="px-0 pb-0">
          <CardTitle className="px-4 text-xl text-zinc-900 sm:px-6">{t("dashboard.progress.title")}</CardTitle>
        </CardHeader>
        <CardContent className="mt-3 px-0 pb-0">
          {rows.map((row) => {
            const detailLabel = getDetailLabel({
              row,
              overview,
              notesCount,
              documentsCount,
              locale,
              t,
            });

            return (
              <PlanningProgressRowItem
                key={row.id}
                row={row}
                title={t(`dashboard.progress.items.${row.id}.title`)}
                description={t(`dashboard.progress.items.${row.id}.description`)}
                detailLabel={detailLabel}
                progressLabel={row.progress !== null ? `${row.progress}%` : undefined}
                onPlaceholderAction={onPlaceholderAction}
              />
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}

function getDetailLabel({
  row,
  overview,
  notesCount,
  documentsCount,
  locale,
  t,
}: {
  row: PlanningProgressRow;
  overview: WeddingOverviewData;
  notesCount: number;
  documentsCount: number;
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (row.id === "budgetExpenses") {
    return t("dashboard.progress.detail.currency", {
      spent: formatCurrencyMinor(overview.spentMinor, overview.currency, locale),
      budget: formatCurrencyMinor(overview.budgetMinor, overview.currency, locale),
    });
  }

  if (row.id === "notesIdeas") {
    return t("dashboard.progress.detail.notes", { count: notesCount });
  }

  if (row.id === "documents") {
    return t("dashboard.progress.detail.documents", { count: documentsCount });
  }

  const [current, total] = row.detailLabel.split("/").map((value) => value.trim());
  if (current && total) {
    const suffixKey = row.id === "guestList"
      ? "dashboard.progress.detail.guestsSuffix"
      : row.id === "eventGuests"
        ? "dashboard.progress.detail.eventsSuffix"
        : row.id === "vendors"
          ? "dashboard.progress.detail.vendorsSuffix"
          : row.id === "schedule"
            ? "dashboard.progress.detail.tasksSuffix"
            : "dashboard.progress.detail.itemsSuffix";

    return `${current} / ${total} ${t(suffixKey)}`;
  }

  return row.detailLabel;
}
