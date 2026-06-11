"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import type { RecentExpenseItem } from "../types";
import { formatCurrencyMinor, formatShortDate } from "../lib/formatting";

type RecentExpensesCardProps = {
  expenses: RecentExpenseItem[];
  currency: string;
  totalSpentMinor: number;
  locale: Locale;
  onOpenAll: () => void;
};

export function RecentExpensesCard({
  expenses,
  currency,
  totalSpentMinor,
  locale,
  onOpenAll,
}: RecentExpensesCardProps) {
  const { t } = useI18n();

  return (
    <Card className="border-zinc-200/80 bg-white">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-lg">{t("dashboard.widgets.recentExpenses.title")}</CardTitle>
        <Button type="button" variant="ghost" className="h-auto text-xs" onClick={onOpenAll}>
          {t("dashboard.widgets.viewAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {expenses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">
            {t("dashboard.widgets.recentExpenses.empty")}
          </p>
        ) : expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {expense.title}
              </p>
              <p className="text-xs text-zinc-600">{formatShortDate(expense.incurredAt, locale)}</p>
            </div>
            <p className="text-sm font-semibold text-zinc-900">
              {formatCurrencyMinor(expense.amountMinor, currency, locale)}
            </p>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="text-zinc-600">{t("dashboard.widgets.recentExpenses.total")}</span>
        <span className="font-semibold text-zinc-900">
          {formatCurrencyMinor(totalSpentMinor, currency, locale)}
        </span>
      </CardFooter>
    </Card>
  );
}
