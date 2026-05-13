"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { DashboardEventCard, DashboardQuickActionId, WeddingDashboardData } from "@/features/wedding-dashboard/types";
import { formatDate } from "@/features/wedding-dashboard/lib/formatting";
import { WeddingDashboardShell } from "@/features/wedding-dashboard/components/WeddingDashboardShell";
import { WeddingDashboardSidebar } from "@/features/wedding-dashboard/components/WeddingDashboardSidebar";
import { WeddingDashboardHeader } from "@/features/wedding-dashboard/components/WeddingDashboardHeader";
import { WeddingOverviewHero } from "@/features/wedding-dashboard/components/WeddingOverviewHero";
import { WeddingEventsStrip } from "@/features/wedding-dashboard/components/WeddingEventsStrip";
import { PlanningProgressSection } from "@/features/wedding-dashboard/components/PlanningProgressSection";
import { DashboardWidgetsGrid } from "@/features/wedding-dashboard/components/DashboardWidgetsGrid";
import { DashboardTipBanner } from "@/features/wedding-dashboard/components/DashboardTipBanner";

type WeddingDetailApiResponse = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    currency: string;
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

export default function WeddingDashboardHomePage() {
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [data, setData] = useState<WeddingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [placeholderKey, setPlaceholderKey] = useState<string | null>(null);

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
          currency: dashboardJson.currency,
          guestCount: weddingJson.wedding._count.guests,
          budgetMinor: dashboardJson.vendorSummary.totalCostMinor || undefined,
          spentMinor: dashboardJson.vendorSummary.totalPaidMinor || expenseSpentMinor || undefined,
          events: mappedEvents,
        });

        if (active) {
          setData(built);
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

  const weddingDateLabel = useMemo(() => {
    if (!data) return "";
    return formatDate(data.weddingDate, locale as Locale);
  }, [data, locale]);

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

  return (
    <>
      <WeddingDashboardShell
        sidebar={
          <WeddingDashboardSidebar
            weddingName={data.weddingName}
            weddingDateLabel={weddingDateLabel}
            currentPath={pathname}
            navigation={data.navigation}
            currentUser={data.currentUser}
            onPlaceholderAction={handlePlaceholderAction}
          />
        }
        mobileSidebar={
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
              <SheetTitle className="sr-only">{t("dashboard.sidebar.mobileTitle")}</SheetTitle>
              <WeddingDashboardSidebar
                weddingName={data.weddingName}
                weddingDateLabel={weddingDateLabel}
                currentPath={pathname}
                navigation={data.navigation}
                currentUser={data.currentUser}
                onPlaceholderAction={(value) => {
                  setIsMobileSidebarOpen(false);
                  handlePlaceholderAction(value);
                }}
              />
            </SheetContent>
          </Sheet>
        }
        header={
          <WeddingDashboardHeader
            firstName={data.currentUser.name.split(" ")[0] ?? data.currentUser.name}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            onQuickAction={handleQuickAction}
            onPlaceholderAction={handlePlaceholderAction}
          />
        }
      >
        <div className="flex flex-col gap-5">
          <WeddingOverviewHero
            overview={data.overview}
            locale={locale as Locale}
            onOpenDetails={() => handlePlaceholderAction("weddingDetails")}
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

          <DashboardTipBanner onAction={() => handlePlaceholderAction("tip")}/>
        </div>
      </WeddingDashboardShell>

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
