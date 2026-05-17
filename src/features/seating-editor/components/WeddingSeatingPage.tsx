"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatCard } from "@/components/app/AppStatCard";
import { AppEmptyState } from "@/components/app/AppEmptyState";
import { useI18n } from "@/i18n/provider";
import { getWeddingRoutes } from "@/lib/routes";

type WeddingSeatingPageProps = {
  weddingId: string;
  planMismatch?: boolean;
  plans: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    updatedAt: string;
    assignments: Array<{ id: string }>;
    guests: Array<{ id: string }>;
    event: { id: string; name: string } | null;
  }>;
};

export function WeddingSeatingPage({ weddingId, plans, planMismatch = false }: WeddingSeatingPageProps) {
  const { t, locale } = useI18n();
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const routes = getWeddingRoutes(weddingId);

  const totalGuests = plans.reduce((sum, plan) => sum + plan.guests.length, 0);
  const totalSeated = plans.reduce((sum, plan) => sum + plan.assignments.length, 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col">
      <WorkspacePageHeader
        title={t("dashboard.sidebar.nav.seating")}
        subtitle={t("events.detail.seatingTab.description")}
      />
      {planMismatch ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("seating.mismatch")}</span>
        </div>
      ) : null}

      <AppPageGrid className="mt-5 md:grid-cols-3">
        <AppStatCard title={t("weddingGuestsPage.stats.total.title")} value={totalGuests} />
        <AppStatCard title={t("events.detail.cards.seating.seated")} value={totalSeated} />
        <AppStatCard title={t("plans.title")} value={plans.length} />
      </AppPageGrid>

      <div className="mt-5">
        {plans.length ? (
          <AppPageGrid className="md:grid-cols-2">
            {plans.map((plan) => (
              <AppSectionCard
                key={plan.id}
                title={plan.name}
                description={`${plan.width} x ${plan.height} • ${dtf.format(new Date(plan.updatedAt))}`}
              >
                <p className="text-sm text-zinc-600">{plan.event?.name ?? "-"}</p>
                <div className="mt-3">
                  <Link
                    href={routes.seatingPlan(plan.id)}
                    className="inline-flex h-9 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
                  >
                    {t("events.detail.actions.openSeatingPlan")}
                  </Link>
                </div>
              </AppSectionCard>
            ))}
          </AppPageGrid>
        ) : (
          <AppEmptyState title={t("events.detail.seatingTab.empty")} />
        )}
      </div>
    </main>
  );
}
