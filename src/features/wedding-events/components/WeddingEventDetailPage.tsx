"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  MapPin,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Settings,
  Users,
  UtensilsCrossed,
  Wallet,
  ListTodo,
  Landmark,
  Rows3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatDate, toIntlLocale } from "@/features/wedding-dashboard/lib/formatting";
import { useWeddingWorkspaceShell } from "@/features/wedding-dashboard/components/WeddingWorkspaceShell";
import { buildEventDetailMockData } from "@/features/wedding-events/event-detail.mock";
import type {
  EventCommandCenterData,
  EventSeatingPlanSummary,
  EventTabId,
  WeddingEventDetail,
  WeddingVendorStatus,
} from "@/features/wedding-events/types";

type WeddingEventDetailPageProps = {
  weddingId: string;
  eventId: string;
};

type WeddingDetailsApiResponse = {
  wedding: {
    id: string;
    name: string;
    date: string | null;
    events: Array<{
      id: string;
      name: string;
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
      startsAt: string | null;
      location: string | null;
      notes: string | null;
    }>;
  };
};

type WeddingEventApiResponse = {
  event: {
    id: string;
    name: string;
    type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
    startsAt: string | null;
    location: string | null;
    notes: string | null;
  };
};

type EventGuestsApiResponse = {
  guests: Array<{
    id: string;
    invitationStatus: "not_invited" | "invited";
    rsvpStatus: "unknown" | "confirmed" | "declined" | "maybe";
    requiresSeat: boolean;
  }>;
};

type SeatingPlanApiResponse = {
  plans: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    tables: Array<{ id: string; seatCount: number }>;
  }>;
};

type VendorsApiResponse = {
  vendors: Array<{
    id: string;
    name: string;
    paymentStatus: "not_started" | "partial" | "paid" | "canceled";
    vendorEvents: Array<{
      eventId: string;
    }>;
  }>;
};

type ExpensesApiResponse = {
  expenses: Array<{
    id: string;
    eventId: string | null;
    amountMinor: number;
    status: "planned" | "committed" | "paid" | "reimbursed" | "canceled";
  }>;
};

type EventTabItem = {
  id: EventTabId;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
};

const eventTabs: EventTabItem[] = [
  { id: "overview", icon: Rows3, key: "events.detail.tabs.overview" },
  { id: "timeline", icon: CalendarClock, key: "events.detail.tabs.timeline" },
  { id: "guests", icon: Users, key: "events.detail.tabs.guests" },
  { id: "seating", icon: UtensilsCrossed, key: "events.detail.tabs.seating" },
  { id: "vendors", icon: Landmark, key: "events.detail.tabs.vendors" },
  { id: "budget", icon: Wallet, key: "events.detail.tabs.budget" },
  { id: "tasks", icon: ListTodo, key: "events.detail.tabs.tasks" },
  { id: "notes", icon: NotebookPen, key: "events.detail.tabs.notes" },
  { id: "settings", icon: Settings, key: "events.detail.tabs.settings" },
];

const categoryKeys = [
  "events.detail.vendors.category.venue",
  "events.detail.vendors.category.catering",
  "events.detail.vendors.category.photographer",
  "events.detail.vendors.category.band",
] as const;

export function WeddingEventDetailPage({ weddingId, eventId }: WeddingEventDetailPageProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { openSidebar } = useWeddingWorkspaceShell();

  const mockData = useMemo(
    () =>
      buildEventDetailMockData({
        weddingId,
        eventId,
      }),
    [weddingId, eventId],
  );

  const [data, setData] = useState<EventCommandCenterData>({
    weddingId,
    weddingName: mockData.weddingName,
    weddingDateLabel: mockData.weddingDateLabel,
    currentUser: mockData.currentUser,
    notificationCount: mockData.notificationCount,
    navigation: mockData.navigation,
    event: mockData.event,
    seatingPlans: mockData.seatingPlans,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EventTabId>("overview");
  const [planName, setPlanName] = useState("");
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const firstSeatingPlan = data.seatingPlans[0];
  const seatingPlanHref = firstSeatingPlan ? `/seating-plans/${firstSeatingPlan.id}` : null;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [weddingResult, eventResult, eventGuestsResult, plansResult, vendorsResult, expensesResult] = await Promise.allSettled([
          fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/events/${eventId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/events/${eventId}/guests`, { cache: "no-store" }),
          fetch(`/api/seating-plans?eventId=${eventId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/expenses`, { cache: "no-store" }),
        ]);

        if (weddingResult.status !== "fulfilled" || !weddingResult.value.ok) {
          throw new Error("wedding_load_failed");
        }

        if (eventResult.status !== "fulfilled" || !eventResult.value.ok) {
          throw new Error("event_load_failed");
        }

        const weddingJson = (await weddingResult.value.json()) as WeddingDetailsApiResponse;
        const eventJson = (await eventResult.value.json()) as WeddingEventApiResponse;

        const eventGuestsJson =
          eventGuestsResult.status === "fulfilled" && eventGuestsResult.value.ok
            ? ((await eventGuestsResult.value.json()) as EventGuestsApiResponse)
            : { guests: [] };

        const plansJson =
          plansResult.status === "fulfilled" && plansResult.value.ok
            ? ((await plansResult.value.json()) as SeatingPlanApiResponse)
            : { plans: [] };

        const vendorsJson =
          vendorsResult.status === "fulfilled" && vendorsResult.value.ok
            ? ((await vendorsResult.value.json()) as VendorsApiResponse)
            : { vendors: [] };

        const expensesJson =
          expensesResult.status === "fulfilled" && expensesResult.value.ok
            ? ((await expensesResult.value.json()) as ExpensesApiResponse)
            : { expenses: [] };

        if (!active) return;

        const mappedEvent = mergeEventWithApi(
          mockData.event,
          eventJson.event,
          eventGuestsJson.guests,
          plansJson.plans,
          vendorsJson.vendors,
          expensesJson.expenses,
          eventId,
        );

        const mappedSeatingPlans: EventSeatingPlanSummary[] = plansJson.plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          width: plan.width,
          height: plan.height,
        }));

        const weddingDateLabel = weddingJson.wedding.date
          ? formatDate(new Date(weddingJson.wedding.date), locale as Locale)
          : mockData.weddingDateLabel;

        const currentEvent = weddingJson.wedding.events.find((item) => item.id === eventId);
        const isMainEvent = currentEvent?.type === "wedding";

        setData({
          weddingId,
          weddingName: weddingJson.wedding.name,
          weddingDateLabel,
          currentUser: mockData.currentUser,
          notificationCount: mockData.notificationCount,
          navigation: mockData.navigation,
          event: {
            ...mappedEvent,
            name: currentEvent?.name ?? mappedEvent.name,
            isMainEvent: isMainEvent ?? mappedEvent.isMainEvent,
          },
          seatingPlans: mappedSeatingPlans.length ? mappedSeatingPlans : mockData.seatingPlans,
        });
      } catch {
        if (active) {
          setError(t("events.detail.states.loadError"));
          setData((current) => ({
            ...current,
            event: {
              ...mockData.event,
              weddingId,
              id: eventId,
            },
          }));
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
  }, [eventId, locale, mockData, t, weddingId]);

  const onCreatePlan = async () => {
    if (!planName.trim()) return;

    setIsCreatingPlan(true);
    setError(null);

    try {
      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: planName.trim(),
          eventId,
          width: 1600,
          height: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error("create_plan_failed");
      }

      const created = (await response.json()) as { plan: { id: string; name: string; width: number; height: number } };

      setData((current) => ({
        ...current,
        seatingPlans: [
          {
            id: created.plan.id,
            name: created.plan.name,
            width: created.plan.width,
            height: created.plan.height,
          },
          ...current.seatingPlans,
        ],
      }));
      setPlanName("");
      setActiveTab("seating");
    } catch {
      setError(t("events.detail.states.createPlanError"));
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const localeName = toIntlLocale(locale as Locale);
  const eventDateLabel = formatEventDate(data.event.date, localeName);
  const eventTimeLabel = `${data.event.startTime} - ${data.event.endTime}`;

  const budgetSpentPercent =
    data.event.budget.total > 0 ? Math.min(100, Math.round((data.event.budget.spent / data.event.budget.total) * 100)) : 0;

  const attendancePercent =
    data.event.guests.total > 0 ? Math.round((data.event.guests.confirmed / data.event.guests.total) * 100) : 0;

  if (isLoading) {
    return <div className="p-6 text-sm text-zinc-600">{t("events.detail.states.loading")}</div>;
  }

  return (
    <>
      <header className="flex flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={openSidebar}
                aria-label={t("dashboard.header.openSidebar")}
              >
                <Menu className="size-4" />
              </Button>
              <span>{t("common.home")}</span>
              <ChevronRight className="size-4" />
              <span>{t("dashboard.sidebar.nav.events")}</span>
              <ChevronRight className="size-4" />
              <span className="font-semibold text-zinc-800">{data.event.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label={t("dashboard.header.notifications")}>
                <Bell className="size-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(`/weddings/${weddingId}/guests`)}>
                {t("events.detail.actions.guestPreview")}
              </Button>
              <Button type="button" className="bg-rose-500 hover:bg-rose-400" onClick={() => undefined}>
                <Edit3 className="size-4" />
                {t("events.detail.actions.editEvent")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-zinc-900">{data.event.name}</h1>
              {data.event.isMainEvent ? (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {t("events.detail.badges.mainEvent")}
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {eventDateLabel}
              </span>
              <Separator orientation="vertical" className="hidden h-4 md:block" />
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" />
                {eventTimeLabel}
              </span>
              <Separator orientation="vertical" className="hidden h-4 md:block" />
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {data.event.venue.name}
              </span>
            </div>
          </div>
      </header>
      <div className="mt-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-1">
          {eventTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                className={`h-9 gap-2 rounded-none border-b-2 px-2 text-sm ${active ? "border-rose-500 text-rose-600" : "border-transparent text-zinc-600"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="size-4" />
                {t(tab.key)}
              </Button>
            );
          })}
        </div>

        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {activeTab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              <Card className="gap-0">
                <CardHeader>
                  <CardTitle>{t("events.detail.cards.snapshot.title")}</CardTitle>
                  <CardDescription>{t("events.detail.cards.snapshot.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                  <MetaItem label={t("events.detail.cards.snapshot.fields.date")} value={eventDateLabel} />
                  <MetaItem label={t("events.detail.cards.snapshot.fields.time")} value={eventTimeLabel} />
                  <MetaItem label={t("events.detail.cards.snapshot.fields.venue")} value={data.event.venue.name} />
                  <MetaItem label={t("events.detail.cards.snapshot.fields.address")} value={data.event.venue.address} />
                  <MetaItem label={t("events.detail.cards.snapshot.fields.type")} value={t(`events.detail.eventType.${data.event.type}`)} />
                  <MetaItem label={t("events.detail.cards.snapshot.fields.theme")} value={data.event.theme} />
                </CardContent>
              </Card>

              <Card className="gap-0">
                <CardHeader className="pb-3">
                  <div>
                    <CardTitle>{t("events.detail.cards.timeline.title")}</CardTitle>
                    <CardDescription>{t("events.detail.cards.timeline.description")}</CardDescription>
                  </div>
                  <CardAction>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-600 hover:bg-zinc-100"
                      onClick={() => undefined}
                      aria-label={t("events.detail.cards.timeline.edit")}
                    >
                      <Edit3 className="size-4" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-0.5">
                    {data.event.timeline.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-[64px_18px_minmax(0,1fr)_28px] items-start gap-2 py-2">
                        <p className="pt-0.5 text-[18px] leading-none text-zinc-900">{item.time}</p>
                        <div className="relative flex h-full justify-center">
                          {index < data.event.timeline.length - 1 ? (
                            <span className="absolute bottom-[-22px] top-3 z-0 w-px bg-rose-200" />
                          ) : null}
                          <span className="relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500 shadow-[0_0_0_1px_rgba(251,113,133,0.35)]" />
                        </div>
                        <div>
                          <p className="text-[16px] font-medium leading-tight text-zinc-900">{t(item.titleKey)}</p>
                        </div>
                        <div className="flex items-center justify-end pt-0.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-zinc-600 hover:bg-zinc-100">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>{t("events.detail.cards.timeline.menu.edit")}</DropdownMenuItem>
                              <DropdownMenuItem>{t("events.detail.cards.timeline.menu.delete")}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="gap-0">
                <CardHeader className="items-center">
                  <CardTitle>{t("events.detail.cards.notes.title")}</CardTitle>
                  <Button type="button" variant="ghost" size="icon" onClick={() => undefined}>
                    <Edit3 className="size-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-zinc-700">
                    {data.event.notes.map((noteKey) => (
                      <li key={noteKey}>• {t(noteKey)}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-5">
              <Card className="gap-0">
                <CardHeader>
                  <CardTitle>{t("events.detail.cards.guests.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-1 pb-2">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-6">
                    <div
                      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-center"
                      style={{
                        background: `conic-gradient(#22c55e ${attendancePercent}%, #facc15 ${Math.min(
                          100,
                          attendancePercent + Math.round((data.event.guests.pending / Math.max(1, data.event.guests.total)) * 100),
                        )}%, #f43f5e 100%)`,
                      }}
                    >
                      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-xl font-semibold text-zinc-900">{data.event.guests.total}</span>
                        <span className="text-xs text-zinc-600">{t("events.detail.cards.guests.total")}</span>
                      </div>
                    </div>
                    <div className="self-center space-y-3 text-sm">
                      <LegendRow colorClass="text-green-500" label={t("events.detail.cards.guests.confirmed")} value={data.event.guests.confirmed} />
                      <LegendRow colorClass="text-amber-400" label={t("events.detail.cards.guests.pending")} value={data.event.guests.pending} />
                      <LegendRow colorClass="text-rose-500" label={t("events.detail.cards.guests.notAttending")} value={data.event.guests.notAttending} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => router.push(`/weddings/${weddingId}/guests`)}
                  >
                    {t("events.detail.actions.manageEventGuests")}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="gap-0">
                <CardHeader className="items-center">
                  <CardTitle>{t("events.detail.cards.vendors.title")}</CardTitle>
                  <Link href={`/weddings/${weddingId}/vendors`} className="text-sm text-zinc-600 hover:text-zinc-900">
                    {t("events.detail.actions.viewVendors")}
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.event.vendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{t(vendor.categoryKey)}</p>
                        <p className="text-sm text-zinc-600">{vendor.name}</p>
                      </div>
                      <VendorStatusBadge
                        status={vendor.status}
                        confirmedLabel={t("events.detail.vendors.status.confirmed")}
                        pendingLabel={t("events.detail.vendors.status.pending")}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="gap-0">
                <CardHeader>
                  <CardTitle>{t("events.detail.cards.budget.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-zinc-600">{t("events.detail.cards.budget.total")}</p>
                  <p className="text-2xl font-semibold text-zinc-900">{formatCurrency(data.event.budget.total, localeName)}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-zinc-700">
                      <span>{t("events.detail.cards.budget.spent")}</span>
                      <span>{formatCurrency(data.event.budget.spent, localeName)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>{t("events.detail.cards.budget.remaining")}</span>
                      <span>{formatCurrency(data.event.budget.total - data.event.budget.spent, localeName)}</span>
                    </div>
                  </div>
                  <Progress value={budgetSpentPercent} className="h-2 bg-zinc-200 [&_[data-slot=progress-indicator]]:bg-emerald-500" />
                  <p className="text-xs text-zinc-600">{t("events.detail.cards.budget.used", { percent: budgetSpentPercent })}</p>
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/weddings/${weddingId}/expenses`)}
                  >
                    {t("events.detail.actions.viewBudget")}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="gap-0">
                <CardHeader className="items-center">
                  <CardTitle>{t("events.detail.cards.tasks.title")}</CardTitle>
                  <Button type="button" variant="ghost" onClick={() => setActiveTab("tasks")}>
                    {t("events.detail.actions.viewAllTasks")}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.event.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3">
                      <Checkbox checked={task.completed} disabled aria-label={t(task.titleKey)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">{t(task.titleKey)}</p>
                        <p className="text-xs text-zinc-600">{t("events.detail.tasks.dueIn", { days: task.dueInDays })}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="gap-0">
                <CardHeader>
                  <CardTitle>{t("events.detail.cards.quickActions.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-sm font-medium text-zinc-900">{t("events.detail.cards.seating.title")}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900">
                      {data.event.seating.seated} / {data.event.seating.total} {t("events.detail.cards.seating.seated")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {data.event.seating.unseated} {t("events.detail.cards.seating.unseated")} · {data.event.seating.warnings} {t("events.detail.cards.seating.warnings")}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={() => undefined}>{t("events.detail.actions.addTimelineItem")}</Button>
                  <Button type="button" variant="outline" onClick={() => undefined}>{t("events.detail.actions.addTask")}</Button>
                  <Button type="button" variant="outline" onClick={() => undefined}>{t("events.detail.actions.addVendor")}</Button>
                  <Button type="button" variant="outline" onClick={() => undefined}>{t("events.detail.actions.addExpense")}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:col-span-2"
                    onClick={() => {
                      if (seatingPlanHref) {
                        router.push(seatingPlanHref);
                        return;
                      }
                      setActiveTab("seating");
                    }}
                  >
                    {t("events.detail.actions.openSeatingPlan")}
                    <ExternalLink className="size-4" />
                  </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "seating" ? (
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>{t("events.detail.seatingTab.title")}</CardTitle>
              <CardDescription>{t("events.detail.seatingTab.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  placeholder={t("events.detail.seatingTab.planNamePlaceholder")}
                  className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
                />
                <Button
                  type="button"
                  onClick={onCreatePlan}
                  disabled={isCreatingPlan || !planName.trim()}
                  className="bg-rose-500 hover:bg-rose-400"
                >
                  {isCreatingPlan ? t("events.detail.seatingTab.creating") : t("events.detail.seatingTab.create")}
                </Button>
              </div>

              <div className="space-y-2">
                {data.seatingPlans.length ? (
                  data.seatingPlans.map((plan) => (
                    <Link
                      key={plan.id}
                      href={`/seating-plans/${plan.id}`}
                      className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm hover:bg-zinc-50"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{plan.name}</p>
                        <p className="text-zinc-600">{plan.width} x {plan.height}</p>
                      </div>
                      <ExternalLink className="size-4 text-zinc-500" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">{t("events.detail.seatingTab.empty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeTab !== "overview" && activeTab !== "seating" ? (
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>{t("events.detail.tabs.placeholderTitle")}</CardTitle>
              <CardDescription>{t("events.detail.tabs.placeholderDescription", { tab: t(`events.detail.tabs.${activeTab}`) })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                className="bg-rose-500 hover:bg-rose-400"
                onClick={() => setActiveTab("overview")}
              >
                {t("events.detail.tabs.backToOverview")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function LegendRow({
  colorClass,
  label,
  value,
}: {
  colorClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-zinc-700 leading-6">
      <Circle className={`size-3 fill-current ${colorClass}`} />
      <span>{label}</span>
      <span className="ml-auto font-medium text-zinc-900">{value}</span>
    </div>
  );
}


function VendorStatusBadge({
  status,
  confirmedLabel,
  pendingLabel,
}: {
  status: WeddingVendorStatus;
  confirmedLabel: string;
  pendingLabel: string;
}) {
  if (status === "confirmed") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{confirmedLabel}</Badge>;
  }

  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pendingLabel}</Badge>;
}

function mergeEventWithApi(
  base: WeddingEventDetail,
  event: WeddingEventApiResponse["event"],
  guests: EventGuestsApiResponse["guests"],
  plans: SeatingPlanApiResponse["plans"],
  vendors: VendorsApiResponse["vendors"],
  expenses: ExpensesApiResponse["expenses"],
  eventId: string,
): WeddingEventDetail {
  const confirmedGuests = guests.filter((guest) => guest.rsvpStatus === "confirmed").length;
  const pendingGuests = guests.filter((guest) => guest.rsvpStatus === "unknown" || guest.rsvpStatus === "maybe").length;
  const declinedGuests = guests.filter((guest) => guest.rsvpStatus === "declined").length;
  const guestsTotal = guests.length || base.guests.total;

  const eventExpenses = expenses.filter((expense) => expense.eventId === eventId && expense.status !== "canceled");
  const spentAmount = eventExpenses.reduce((sum, item) => sum + item.amountMinor, 0) / 100;

  const eventVendors = vendors.filter((vendor) => vendor.vendorEvents.some((relation) => relation.eventId === eventId));
  const mappedVendors: WeddingEventDetail["vendors"] = eventVendors.slice(0, 4).map((vendor, index) => ({
    id: vendor.id,
    categoryKey: categoryKeys[index] ?? "events.detail.vendors.category.vendor",
    name: vendor.name,
    status: vendor.paymentStatus === "not_started" ? "pending" : "confirmed",
  }));

  const firstPlan = plans[0];
  const totalPlanSeats = firstPlan ? firstPlan.tables.reduce((sum, table) => sum + table.seatCount, 0) : base.seating.total;
  const seatedGuests = Math.min(guestsTotal, confirmedGuests || base.seating.seated);
  const unseatedGuests = Math.max(0, guestsTotal - seatedGuests);
  const warnings = Math.max(0, guestsTotal - totalPlanSeats);

  const startsAtDate = event.startsAt ? new Date(event.startsAt) : null;

  return {
    ...base,
    name: event.name || base.name,
    type: mapEventType(event.type),
    isMainEvent: event.type === "wedding",
    date: startsAtDate ? toDateString(startsAtDate) : base.date,
    startTime: startsAtDate ? toTimeString(startsAtDate) : base.startTime,
    venue: {
      name: event.location || base.venue.name,
      address: event.location || base.venue.address,
    },
    guests: {
      total: guestsTotal,
      confirmed: confirmedGuests,
      pending: pendingGuests,
      notAttending: declinedGuests,
    },
    seating: {
      seated: seatedGuests,
      total: guestsTotal,
      unseated: unseatedGuests,
      tables: firstPlan?.tables.length ?? base.seating.tables,
      warnings,
    },
    budget: {
      total: Math.max(base.budget.total, spentAmount || base.budget.spent),
      spent: spentAmount || base.budget.spent,
    },
    vendors: mappedVendors.length ? mappedVendors : base.vendors,
    notes: event.notes ? [event.notes, ...base.notes] : base.notes,
  };
}

function mapEventType(value: WeddingEventApiResponse["event"]["type"]): WeddingEventDetail["type"] {
  if (value === "other") return "custom";
  return value;
}

function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeString(value: Date): string {
  return value.toTimeString().slice(0, 5);
}

function formatEventDate(value: string, locale: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}
