"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Ellipsis, MapPin, Plus, Search } from "lucide-react";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { AppEmptyState } from "@/components/app/AppEmptyState";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function StyledPlanPreview({ width, height }: { width: number; height: number }) {
  return (
    <div className="relative h-[104px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#d4d4d8_1px,transparent_1px),linear-gradient(to_bottom,#d4d4d8_1px,transparent_1px)] bg-[size:16px_16px] opacity-35" />
      <div className="absolute left-4 top-4 flex gap-2">
        <span className="size-3 rounded-full bg-violet-300" />
        <span className="size-3 rounded-full bg-violet-300" />
        <span className="size-3 rounded-full bg-violet-300" />
      </div>
      <div className="absolute bottom-4 right-4 h-6 w-14 rounded-md border border-violet-200 bg-violet-100/80" />
      <div className="absolute bottom-4 left-4 text-[11px] font-medium text-zinc-500">
        {width} x {height}
      </div>
    </div>
  );
}

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
  const [query, setQuery] = useState("");
  const [planName, setPlanName] = useState("");
  const [eventFilterId, setEventFilterId] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [duplicatingPlanId, setDuplicatingPlanId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const selectedEventName = useMemo(
    () => events.find((event) => event.id === selectedEventId)?.name ?? null,
    [events, selectedEventId],
  );

  const visiblePlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = plans.filter((plan) => {
      if (eventFilterId !== "all" && plan.event?.id !== eventFilterId) return false;
      if (!normalizedQuery) return true;
      return plan.name.toLowerCase().includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, locale);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [eventFilterId, locale, plans, query, sortBy]);

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

  const handleDuplicatePlan = async (sourcePlanId: string) => {
    if (!canEdit || duplicatingPlanId || isCreating) return;

    setDuplicateError(null);
    setDuplicatingPlanId(sourcePlanId);

    try {
      const response = await fetch(`/api/seating-plans/${sourcePlanId}/duplicate`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            plan?: {
              id: string;
              name: string;
              width: number;
              height: number;
              updatedAt: string;
              assignments: Array<{ id: string }>;
              guests: Array<{ id: string }>;
              event: { id: string; name: string } | null;
            };
          }
        | null;

      if (!response.ok || !payload?.plan) {
        setDuplicateError(payload?.error ?? t("events.detail.seatingTab.duplicateError"));
        return;
      }

      setPlans((current) => [payload.plan!, ...current]);
    } catch {
      setDuplicateError(t("events.detail.seatingTab.duplicateError"));
    } finally {
      setDuplicatingPlanId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1220px] flex-col">
      <WorkspacePageHeader
        title={t("dashboard.sidebar.nav.seating")}
        subtitle={t("events.detail.seatingTab.description")}
        actions={
          canEdit ? (
            <Button
              type="button"
              variant="primary"
              className="h-10 px-4"
              onClick={handleCreatePlan}
              disabled={!canEdit || isCreating || !selectedEventId || !planName.trim()}
            >
              <Plus className="mr-2 size-4" />
              {isCreating ? t("events.detail.seatingTab.creating") : t("events.detail.seatingTab.create")}
            </Button>
          ) : null
        }
      />
      {planMismatch ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("seating.mismatch")}</span>
        </div>
      ) : null}

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full max-w-[460px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-11 border-zinc-300 bg-white pl-9 transition-colors focus-visible:ring-zinc-200"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("events.detail.seatingTab.searchPlaceholder")}
              />
            </div>
            <Input
              className="h-11 border-zinc-300 bg-white transition-colors focus-visible:ring-zinc-200 lg:max-w-[260px]"
              value={planName}
              onChange={(event) => setPlanName(event.target.value)}
              placeholder={t("events.detail.seatingTab.planNamePlaceholder")}
              disabled={!canEdit || isCreating}
            />
            <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={!canEdit || isCreating || events.length === 0}>
              <SelectTrigger className="h-11 border-zinc-300 bg-white transition-colors focus-visible:ring-zinc-200 lg:min-w-[220px]">
                <SelectValue placeholder={t("events.detail.seatingTab.selectEventForPlan")} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={eventFilterId} onValueChange={setEventFilterId}>
              <SelectTrigger className="h-11 min-w-[210px] border-zinc-300 bg-white transition-colors focus-visible:ring-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("events.detail.seatingTab.filterAllEvents")}</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value === "name" ? "name" : "updated")}>
              <SelectTrigger className="h-11 min-w-[230px] border-zinc-300 bg-white transition-colors focus-visible:ring-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">{t("events.detail.seatingTab.sortUpdated")}</SelectItem>
                <SelectItem value="name">{t("events.detail.seatingTab.sortName")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {createError ? <p className="px-4 pt-3 text-sm text-red-600">{createError}</p> : null}
        {duplicateError ? <p className="px-4 pt-3 text-sm text-red-600">{duplicateError}</p> : null}

        {visiblePlans.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[1100px] px-4 py-4 md:px-5">
                <div className="grid grid-cols-[220px_1.8fr_1.2fr_1fr_1.2fr_170px] gap-5 border-b border-zinc-200 px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  <span>{t("events.detail.seatingTab.columns.plan")}</span>
                  <span>{t("events.detail.seatingTab.columns.event")}</span>
                  <span>{t("events.detail.seatingTab.columns.seated")}</span>
                  <span>{t("events.detail.seatingTab.columns.progress")}</span>
                  <span>{t("events.detail.seatingTab.columns.updated")}</span>
                  <span>{t("events.detail.seatingTab.columns.actions")}</span>
                </div>
                <div className="space-y-3 pt-3">
                  {visiblePlans.map((plan) => {
                    const seatsTaken = plan.assignments.length;
                    const seatCapacity = plan.guests.length;
                    const completion = seatCapacity > 0 ? Math.round((seatsTaken / seatCapacity) * 100) : 0;
                    const remainingSeats = Math.max(0, seatCapacity - seatsTaken);

                    return (
                      <div
                        key={plan.id}
                        className="grid grid-cols-[220px_1.8fr_1.2fr_1fr_1.2fr_170px] items-center gap-5 rounded-2xl border border-zinc-200 bg-zinc-50/45 px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                      >
                        <StyledPlanPreview width={plan.width} height={plan.height} />
                        <div className="space-y-2">
                          <div className="line-clamp-1 text-[34px] leading-[1.05] font-semibold tracking-tight text-zinc-900">{plan.name}</div>
                          <div className="inline-flex rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
                          </div>
                        </div>
                        <div>
                          <p className="tabular-nums text-4xl font-semibold tracking-tight text-zinc-900">
                            {seatsTaken} / {seatCapacity}
                          </p>
                          <p className="text-sm text-zinc-600">{t("events.detail.cards.seating.seated")}</p>
                        </div>
                        <div>
                          <div className="h-2.5 rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${completion}%` }} />
                          </div>
                          <p className="mt-2 text-base font-semibold text-emerald-700">{completion}%</p>
                          {remainingSeats > 0 ? (
                            <p className="text-xs text-zinc-500">{t("events.detail.seatingTab.remainingToSeat", { count: remainingSeats })}</p>
                          ) : null}
                        </div>
                        <div className="space-y-1 text-sm text-zinc-600">
                          <p className="inline-flex items-center gap-2">
                            <CalendarDays className="size-4 text-zinc-400" />
                            {dtf.format(new Date(plan.updatedAt))}
                          </p>
                          <p className="inline-flex items-center gap-2">
                            <MapPin className="size-4 text-zinc-400" />
                            {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={routes.seatingPlan(plan.id)}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-violet-300 bg-white px-3.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                          >
                            {t("events.detail.actions.openSeatingPlan")}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
                                aria-label={t("events.detail.seatingTab.moreActions")}
                              >
                                <Ellipsis className="size-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => void handleDuplicatePlan(plan.id)}
                                disabled={!canEdit || !!duplicatingPlanId || isCreating}
                              >
                                {duplicatingPlanId === plan.id
                                  ? t("events.detail.seatingTab.duplicating")
                                  : t("events.detail.seatingTab.duplicate")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {visiblePlans.map((plan) => {
                const seatsTaken = plan.assignments.length;
                const seatCapacity = plan.guests.length;
                const completion = seatCapacity > 0 ? Math.round((seatsTaken / seatCapacity) * 100) : 0;
                const remainingSeats = Math.max(0, seatCapacity - seatsTaken);

                return (
                  <article key={plan.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3.5 shadow-xs transition-all duration-200 hover:bg-white">
                    <StyledPlanPreview width={plan.width} height={plan.height} />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900">{plan.name}</h3>
                        <p className="mt-1 inline-flex rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-500 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200"
                            aria-label={t("events.detail.seatingTab.moreActions")}
                          >
                            <Ellipsis className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void handleDuplicatePlan(plan.id)}
                            disabled={!canEdit || !!duplicatingPlanId || isCreating}
                          >
                            {duplicatingPlanId === plan.id
                              ? t("events.detail.seatingTab.duplicating")
                              : t("events.detail.seatingTab.duplicate")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3">
                      <p className="tabular-nums text-3xl font-semibold tracking-tight text-zinc-900">
                        {seatsTaken} / {seatCapacity}
                      </p>
                      <p className="text-sm text-zinc-600">{t("events.detail.cards.seating.seated")}</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-2.5 rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${completion}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-base font-semibold text-emerald-700">{completion}%</p>
                        {remainingSeats > 0 ? (
                          <p className="text-xs text-zinc-500">{t("events.detail.seatingTab.remainingToSeat", { count: remainingSeats })}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-zinc-600">
                      <p className="inline-flex items-center gap-2">
                        <CalendarDays className="size-4 text-zinc-400" />
                        {dtf.format(new Date(plan.updatedAt))}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <MapPin className="size-4 text-zinc-400" />
                        {plan.event?.name ?? t("events.detail.seatingTab.noEvent")}
                      </p>
                    </div>
                    <Link
                      href={routes.seatingPlan(plan.id)}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-violet-300 bg-white px-3.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                    >
                      {t("events.detail.actions.openSeatingPlan")}
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-6">
            <AppEmptyState title={t("events.detail.seatingTab.empty")} />
          </div>
        )}

        <div className="border-t border-zinc-100 p-4 md:p-5">
          <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-5 text-center">
            <p className="text-base font-semibold text-violet-700">{t("events.detail.seatingTab.createInlineCta")}</p>
            <p className="mt-1 text-sm text-zinc-600">{t("events.detail.seatingTab.createInlineHint")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
