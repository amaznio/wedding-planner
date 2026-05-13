"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { DashboardEventCard, DashboardQuickActionId, WeddingDashboardData } from "@/features/wedding-dashboard/types";
import { WeddingDashboardHeader } from "@/features/wedding-dashboard/components/WeddingDashboardHeader";
import { WeddingOverviewHero } from "@/features/wedding-dashboard/components/WeddingOverviewHero";
import { WeddingEventsStrip } from "@/features/wedding-dashboard/components/WeddingEventsStrip";
import { PlanningProgressSection } from "@/features/wedding-dashboard/components/PlanningProgressSection";
import { DashboardWidgetsGrid } from "@/features/wedding-dashboard/components/DashboardWidgetsGrid";
import { DashboardTipBanner } from "@/features/wedding-dashboard/components/DashboardTipBanner";
import { useWeddingWorkspaceShell } from "@/features/wedding-dashboard/components/WeddingWorkspaceShell";

type WeddingDetailApiResponse = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    timezone: string | null;
    location: string | null;
    currency: string;
    notes: string | null;
    events: Array<{
      id: string;
      name: string;
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
      startsAt: string | null;
    }>;
    _count: {
      guests: number;
      vendors: number;
      expenses: number;
      households: number;
      guestGroups: number;
    };
  };
};

type WeddingDashboardApiResponse = {
  currency: string;
  expenseSummary: Array<{
    status: string;
    _sum: { amountMinor: number | null };
    _count: { _all: number };
  }>;
  vendorSummary: {
    totalCostMinor: number;
    totalDepositMinor: number;
    totalPaidMinor: number;
    remainingMinor: number;
  };
};

type WeddingFormState = {
  name: string;
  date: string;
  timezone: string;
  location: string;
  currency: string;
  notes: string;
};

type WeddingUpdateApiResponse = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    timezone: string | null;
    location: string | null;
    currency: string;
    notes: string | null;
  };
};

export default function WeddingDashboardHomePage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const router = useRouter();
  const { t, locale } = useI18n();
  const { openSidebar } = useWeddingWorkspaceShell();

  const [data, setData] = useState<WeddingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeholderKey, setPlaceholderKey] = useState<string | null>(null);
  const [isWeddingDetailsOpen, setIsWeddingDetailsOpen] = useState(false);
  const [weddingForm, setWeddingForm] = useState<WeddingFormState | null>(null);
  const [isWeddingSaving, setIsWeddingSaving] = useState(false);
  const [weddingSaveError, setWeddingSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [weddingResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/dashboard`, { cache: "no-store" }),
        ]);

        if (!weddingResponse.ok) throw new Error("weddingLoadFailed");
        if (!dashboardResponse.ok) throw new Error("dashboardLoadFailed");

        const weddingJson = (await weddingResponse.json()) as WeddingDetailApiResponse;
        const dashboardJson = (await dashboardResponse.json()) as WeddingDashboardApiResponse;

        const mappedEvents = mapEvents(weddingId, weddingJson.wedding.events);
        const expenseSpentMinor = dashboardJson.expenseSummary
          .filter((row) => row.status !== "canceled")
          .reduce((sum, row) => sum + (row._sum.amountMinor ?? 0), 0);

        const built = buildDashboardMockData({
          weddingId,
          weddingName: weddingJson.wedding.name,
          weddingDate: weddingJson.wedding.date ? new Date(weddingJson.wedding.date) : null,
          venue: weddingJson.wedding.location ?? undefined,
          currency: dashboardJson.currency,
          guestCount: weddingJson.wedding._count.guests,
          budgetMinor: dashboardJson.vendorSummary.totalCostMinor || undefined,
          spentMinor: dashboardJson.vendorSummary.totalPaidMinor || expenseSpentMinor || undefined,
          events: mappedEvents,
        });

        if (active) {
          setData(built);
          setWeddingForm({
            name: weddingJson.wedding.name ?? "",
            date: weddingJson.wedding.date ? weddingJson.wedding.date.slice(0, 10) : "",
            timezone: weddingJson.wedding.timezone ?? "",
            location: weddingJson.wedding.location ?? "",
            currency: weddingJson.wedding.currency ?? "PLN",
            notes: weddingJson.wedding.notes ?? "",
          });
        }
      } catch {
        if (active) {
          setError(t("dashboard.states.loadError"));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [weddingId, t]);

  const firstEventHref = useMemo(() => data?.events.find((event) => event.href)?.href, [data?.events]);

  if (isLoading || !data) {
    return <main className="p-6 text-sm text-zinc-600">{t("dashboard.states.loading")}</main>;
  }

  if (error) {
    return <main className="p-6 text-sm text-red-600">{error}</main>;
  }

  const handlePlaceholderAction = (key: string) => {
    setPlaceholderKey(key);
  };

  const handleQuickAction = (action: DashboardQuickActionId) => {
    if (action === "expense") {
      router.push(`/weddings/${weddingId}/expenses`);
      return;
    }

    if (action === "vendor") {
      router.push(`/weddings/${weddingId}/vendors`);
      return;
    }

    if (action === "event" && firstEventHref) {
      router.push(firstEventHref);
      return;
    }

    handlePlaceholderAction(action);
  };

  const handleWeddingSave = async () => {
    if (!weddingForm) return;

    const trimmedName = weddingForm.name.trim();
    const trimmedCurrency = weddingForm.currency.trim().toUpperCase();

    if (!trimmedName || trimmedCurrency.length !== 3) {
      setWeddingSaveError(t("dashboard.overview.edit.errorInvalid"));
      return;
    }

    setIsWeddingSaving(true);
    setWeddingSaveError(null);

    try {
      const payload = {
        name: trimmedName,
        date: weddingForm.date.trim() ? weddingForm.date.trim() : null,
        timezone: weddingForm.timezone.trim() ? weddingForm.timezone.trim() : null,
        location: weddingForm.location.trim() ? weddingForm.location.trim() : null,
        currency: trimmedCurrency,
        notes: weddingForm.notes.trim() ? weddingForm.notes.trim() : null,
      };

      const response = await fetch(`/api/weddings/${weddingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Failed to update wedding");
      }

      const json = (await response.json()) as WeddingUpdateApiResponse;
      const nextWeddingDate = json.wedding.date ? new Date(json.wedding.date) : null;

      setWeddingForm({
        name: json.wedding.name,
        date: json.wedding.date ? json.wedding.date.slice(0, 10) : "",
        timezone: json.wedding.timezone ?? "",
        location: json.wedding.location ?? "",
        currency: json.wedding.currency ?? "PLN",
        notes: json.wedding.notes ?? "",
      });

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          weddingName: json.wedding.name,
          weddingDate: nextWeddingDate ?? prev.weddingDate,
          overview: {
            ...prev.overview,
            coupleNames: json.wedding.name,
            weddingDate: nextWeddingDate ?? prev.overview.weddingDate,
            venue: json.wedding.location?.trim() || prev.overview.venue,
            currency: json.wedding.currency,
          },
        };
      });

      setIsWeddingDetailsOpen(false);
      router.refresh();
    } catch (saveError) {
      setWeddingSaveError(saveError instanceof Error ? saveError.message : t("dashboard.overview.edit.errorSave"));
    } finally {
      setIsWeddingSaving(false);
    }
  };

  return (
    <>
      <WeddingDashboardHeader
        firstName={data.currentUser.name.split(" ")[0] ?? data.currentUser.name}
        onOpenSidebar={openSidebar}
        onQuickAction={handleQuickAction}
        onPlaceholderAction={handlePlaceholderAction}
      />
      <div className="mt-5 flex flex-col gap-5">
        <WeddingOverviewHero
          overview={data.overview}
          locale={locale as Locale}
          onOpenDetails={() => {
            setWeddingSaveError(null);
            setIsWeddingDetailsOpen(true);
          }}
        />

        <WeddingEventsStrip
          events={data.events}
          locale={locale as Locale}
          onAddEvent={() => handlePlaceholderAction("addEvent")}
        />

        <PlanningProgressSection
          rows={data.planningProgress}
          overview={data.overview}
          notesCount={data.notesCount}
          documentsCount={data.documentsCount}
          locale={locale as Locale}
          onPlaceholderAction={handlePlaceholderAction}
        />

        <DashboardWidgetsGrid
          tasks={data.upcomingTasks}
          expenses={data.recentExpenses}
          actions={data.quickActions}
          currency={data.overview.currency}
          totalSpentMinor={data.overview.spentMinor}
          locale={locale as Locale}
          onQuickAction={handleQuickAction}
          onPlaceholderAction={handlePlaceholderAction}
        />

        <DashboardTipBanner onAction={() => handlePlaceholderAction("tip")} />
      </div>

      <Dialog open={isWeddingDetailsOpen} onOpenChange={(open) => {
        setIsWeddingDetailsOpen(open);
        if (!open) setWeddingSaveError(null);
      }}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.overview.edit.title")}</DialogTitle>
            <DialogDescription>{t("dashboard.overview.edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="wedding-name" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.name")}
              </label>
              <Input
                id="wedding-name"
                value={weddingForm?.name ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                placeholder={t("dashboard.overview.edit.namePlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="wedding-date" className="text-sm font-medium text-zinc-800">
                  {t("dashboard.overview.edit.date")}
                </label>
                <Input
                  id="wedding-date"
                  type="date"
                  value={weddingForm?.date ?? ""}
                  onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                  disabled={isWeddingSaving}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wedding-currency" className="text-sm font-medium text-zinc-800">
                  {t("dashboard.overview.edit.currency")}
                </label>
                <Input
                  id="wedding-currency"
                  value={weddingForm?.currency ?? ""}
                  onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, currency: event.target.value.toUpperCase() } : prev))}
                  placeholder="PLN"
                  maxLength={3}
                  disabled={isWeddingSaving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-timezone" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.timezone")}
              </label>
              <Input
                id="wedding-timezone"
                value={weddingForm?.timezone ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
                placeholder="Europe/Warsaw"
                disabled={isWeddingSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-location" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.location")}
              </label>
              <Input
                id="wedding-location"
                value={weddingForm?.location ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, location: event.target.value } : prev))}
                placeholder={t("dashboard.overview.edit.locationPlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-notes" className="text-sm font-medium text-zinc-800">
                {t("dashboard.overview.edit.notes")}
              </label>
              <textarea
                id="wedding-notes"
                value={weddingForm?.notes ?? ""}
                onChange={(event) => setWeddingForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300"
                placeholder={t("dashboard.overview.edit.notesPlaceholder")}
                disabled={isWeddingSaving}
              />
            </div>
            {weddingSaveError ? <p className="text-sm text-red-600">{weddingSaveError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsWeddingDetailsOpen(false)} disabled={isWeddingSaving}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void handleWeddingSave()} disabled={isWeddingSaving}>
                {isWeddingSaving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={placeholderKey !== null} onOpenChange={(open) => { if (!open) setPlaceholderKey(null); }}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.placeholders.title")}</DialogTitle>
            <DialogDescription>
              {placeholderKey ? t(`dashboard.placeholders.items.${placeholderKey}`) : t("dashboard.placeholders.default")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setPlaceholderKey(null)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function mapEvents(
  weddingId: string,
  events: WeddingDetailApiResponse["wedding"]["events"],
): DashboardEventCard[] {
  if (!events.length) return [];

  const activeEventId = events.find((event) => event.type === "wedding")?.id ?? events[0].id;

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.startsAt ? new Date(event.startsAt) : new Date(),
    href: `/weddings/${weddingId}/events/${event.id}`,
    status: event.id === activeEventId ? "active" : "planned",
    type: event.type,
  }));
}
