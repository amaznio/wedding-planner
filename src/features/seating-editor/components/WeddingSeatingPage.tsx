"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatCard } from "@/components/app/AppStatCard";
import { AppEmptyState } from "@/components/app/AppEmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";
import { getWeddingRoutes } from "@/lib/routes";

type WeddingSeatingPageProps = {
  weddingId: string;
  canEdit: boolean;
  planMismatch?: boolean;
  events: Array<{
    id: string;
    name: string;
  }>;
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

export function WeddingSeatingPage({
  weddingId,
  canEdit,
  plans: initialPlans,
  events,
  planMismatch = false,
}: WeddingSeatingPageProps) {
  const { t, locale } = useI18n();
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const routes = getWeddingRoutes(weddingId);
  const [plans, setPlans] = useState(initialPlans);
  const [planName, setPlanName] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedEventName = useMemo(
    () => events.find((event) => event.id === selectedEventId)?.name ?? null,
    [events, selectedEventId],
  );

  const totalGuests = plans.reduce((sum, plan) => sum + plan.guests.length, 0);
  const totalSeated = plans.reduce((sum, plan) => sum + plan.assignments.length, 0);

  const handleCreatePlan = async () => {
    if (!canEdit || !selectedEventId || !planName.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName.trim(),
          eventId: selectedEventId,
          width: 1600,
          height: 1000,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            plan?: {
              id: string;
              name: string;
              width: number;
              height: number;
              updatedAt?: string;
              assignments?: Array<{ id: string }>;
              guests?: Array<{ id: string }>;
            };
          }
        | null;

      if (!response.ok || !payload?.plan) {
        setCreateError(payload?.error ?? t("events.detail.states.createPlanError"));
        return;
      }

      setPlans((current) => [
        {
          id: payload.plan!.id,
          name: payload.plan!.name,
          width: payload.plan!.width,
          height: payload.plan!.height,
          updatedAt: payload.plan!.updatedAt ?? new Date().toISOString(),
          assignments: payload.plan!.assignments ?? [],
          guests: payload.plan!.guests ?? [],
          event: selectedEventName ? { id: selectedEventId, name: selectedEventName } : null,
        },
        ...current,
      ]);
      setPlanName("");
    } catch {
      setCreateError(t("events.detail.states.createPlanError"));
    } finally {
      setIsCreating(false);
    }
  };

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
      <AppSectionCard title={t("events.detail.seatingTab.title")}>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
          <Input
            value={planName}
            onChange={(event) => setPlanName(event.target.value)}
            placeholder={t("events.detail.seatingTab.planNamePlaceholder")}
            disabled={!canEdit || isCreating}
          />
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
            disabled={!canEdit || isCreating || events.length === 0}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="primary"
            onClick={handleCreatePlan}
            disabled={!canEdit || isCreating || !selectedEventId || !planName.trim()}
          >
            {isCreating ? t("events.detail.seatingTab.creating") : t("events.detail.seatingTab.create")}
          </Button>
        </div>
        {createError ? <p className="mt-2 text-sm text-red-600">{createError}</p> : null}
      </AppSectionCard>
      </div>

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
