"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { enUS, pl } from "react-day-picker/locale";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Trash2,
  Users,
  UtensilsCrossed,
  Rows3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppQuickActionsCard } from "@/components/app/AppQuickActionsCard";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { WeddingEventDetailPageLoading } from "@/features/wedding-dashboard/components/WorkspacePageLoading";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatDate, toIntlLocale } from "@/features/wedding-dashboard/lib/formatting";
import { buildEventDetailMockData } from "@/features/wedding-events/event-detail.mock";
import { getWeddingRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";
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

type WeddingEventApiType = "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";

type EventEditForm = {
  name: string;
  type: WeddingEventApiType;
  date: string;
  time: string;
  location: string;
  address: string;
  requiresSeatingPlan: boolean;
};

type WeddingDetailsApiResponse = {
  access: {
    role: "owner" | "editor" | "viewer";
    canEdit: boolean;
    canManageMembers: boolean;
    canDeleteWedding: boolean;
  };
  wedding: {
    id: string;
    name: string;
    date: string | null;
    location: string | null;
    events: Array<{
      id: string;
      name: string;
      type: WeddingEventApiType;
      requiresSeatingPlan: boolean;
      startsAt: string | null;
      location: string | null;
      address: string | null;
      notes: string | null;
    }>;
  };
};

type WeddingEventApiResponse = {
  event: {
    id: string;
    name: string;
    type: WeddingEventApiType;
    requiresSeatingPlan: boolean;
    startsAt: string | null;
    location: string | null;
    address: string | null;
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
    lifecycleStatus: "considering" | "booked" | "contract_signed" | "canceled";
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

type EventTimelineItem = {
  id: string;
  time: string;
  title: string;
  notes: string | null;
  sortOrder: number;
  completed: boolean;
};

type TimelineItemsApiResponse = {
  items: EventTimelineItem[];
};

type TimelineForm = {
  time: string;
  title: string;
  notes: string;
  sortOrder: string;
  completed: boolean;
};

type EventTabItem = {
  id: EventTabId;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
};

const eventTabs: EventTabItem[] = [
  { id: "overview", icon: Rows3, key: "events.detail.tabs.overview" },
  { id: "schedule", icon: CalendarClock, key: "events.detail.tabs.timeline" },
  { id: "guests", icon: Users, key: "events.detail.tabs.guests" },
  { id: "seating", icon: UtensilsCrossed, key: "events.detail.tabs.seating" },
  { id: "notes", icon: NotebookPen, key: "events.detail.tabs.notes" },
];

const categoryKeys = [
  "events.detail.vendors.category.venue",
  "events.detail.vendors.category.catering",
  "events.detail.vendors.category.photographer",
  "events.detail.vendors.category.band",
] as const;

const emptyTimelineForm: TimelineForm = {
  time: "",
  title: "",
  notes: "",
  sortOrder: "0",
  completed: false,
};

const eventTypeOptions: Array<{ value: WeddingEventApiType; labelKey: string }> = [
  { value: "wedding", labelKey: "events.detail.eventType.wedding" },
  { value: "ceremony", labelKey: "events.detail.eventType.ceremony" },
  { value: "afterparty", labelKey: "events.detail.eventType.afterparty" },
  { value: "bachelor", labelKey: "events.detail.eventType.bachelor" },
  { value: "bachelorette", labelKey: "events.detail.eventType.bachelorette" },
  { value: "other", labelKey: "events.detail.eventType.custom" },
];

export function WeddingEventDetailPage({ weddingId, eventId }: WeddingEventDetailPageProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const tabFromQuery = searchParams.get("tab");
  const allowedTabs = useMemo(() => new Set<EventTabId>(["overview", "schedule", "guests", "seating", "notes"]), []);
  const activeTab = tabFromQuery && allowedTabs.has(tabFromQuery as EventTabId)
    ? (tabFromQuery as EventTabId)
    : "overview";
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [canEditWedding, setCanEditWedding] = useState(false);
  const [timelineItems, setTimelineItems] = useState<EventTimelineItem[]>([]);
  const [timelineDialogMode, setTimelineDialogMode] = useState<"create" | "edit" | null>(null);
  const [timelineForm, setTimelineForm] = useState<TimelineForm>(emptyTimelineForm);
  const [editingTimelineItemId, setEditingTimelineItemId] = useState<string | null>(null);
  const [deleteTimelineItemId, setDeleteTimelineItemId] = useState<string | null>(null);
  const [isSavingTimelineItem, setIsSavingTimelineItem] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [eventEditForm, setEventEditForm] = useState<EventEditForm | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventEditError, setEventEditError] = useState<string | null>(null);
  const weddingRoutes = useMemo(() => getWeddingRoutes(weddingId), [weddingId]);

  const firstSeatingPlan = data.seatingPlans[0];
  const seatingPlanHref = firstSeatingPlan ? weddingRoutes.seatingPlan(firstSeatingPlan.id) : null;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [weddingResult, eventResult, eventGuestsResult, plansResult, vendorsResult, expensesResult, timelineResult] = await Promise.allSettled([
          fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/events/${eventId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/events/${eventId}/guests`, { cache: "no-store" }),
          fetch(`/api/seating-plans?eventId=${eventId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/expenses`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/events/${eventId}/timeline-items`, { cache: "no-store" }),
        ]);

        if (weddingResult.status !== "fulfilled" || !weddingResult.value.ok) {
          throw new Error("wedding_load_failed");
        }

        if (eventResult.status !== "fulfilled" || !eventResult.value.ok) {
          throw new Error("event_load_failed");
        }

        const weddingJson = (await weddingResult.value.json()) as WeddingDetailsApiResponse;
        const eventJson = (await eventResult.value.json()) as WeddingEventApiResponse;
        setCanEditWedding(weddingJson.access?.canEdit ?? false);

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

        const timelineJson =
          timelineResult.status === "fulfilled" && timelineResult.value.ok
            ? ((await timelineResult.value.json()) as TimelineItemsApiResponse)
            : { items: [] };

        if (!active) return;

        const mappedEvent = mergeEventWithApi(
          mockData.event,
          eventJson.event,
          eventGuestsJson.guests,
          plansJson.plans,
          vendorsJson.vendors,
          expensesJson.expenses,
          eventId,
          weddingJson.wedding.location,
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
        setTimelineItems(timelineJson.items);
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

  const setActiveTabWithUrl = (nextTab: EventTabId) => {
    const nextSearch = new URLSearchParams(searchParams.toString());
    if (nextTab === "overview") {
      nextSearch.delete("tab");
    } else {
      nextSearch.set("tab", nextTab);
    }
    const nextQueryString = nextSearch.toString();
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname);
  };

  const openEditEventDialog = () => {
    setEventEditForm({
      name: data.event.name,
      type: mapDetailTypeToApi(data.event.type),
      date: data.event.date,
      time: data.event.startTime,
      location: data.event.venue.name === "-" ? "" : data.event.venue.name,
      address: data.event.venue.address === "-" ? "" : data.event.venue.address,
      requiresSeatingPlan: data.event.requiresSeatingPlan,
    });
    setEventEditError(null);
    setIsEditEventOpen(true);
  };

  const closeEditEventDialog = () => {
    setIsEditEventOpen(false);
    setEventEditForm(null);
    setEventEditError(null);
  };

  const saveEvent = async () => {
    if (!canEditWedding || !eventEditForm) return;
    if (!eventEditForm.name.trim()) {
      setEventEditError(t("events.list.editDialog.nameRequired"));
      return;
    }
    if ((eventEditForm.date && !eventEditForm.time) || (!eventEditForm.date && eventEditForm.time)) {
      setEventEditError(t("events.list.editDialog.dateTimePairRequired"));
      return;
    }

    setIsSavingEvent(true);
    setEventEditError(null);
    try {
      const startsAt = eventEditForm.date && eventEditForm.time
        ? new Date(`${eventEditForm.date}T${eventEditForm.time}`).toISOString()
        : null;
      const response = await fetch(`/api/weddings/${weddingId}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventEditForm.name.trim(),
          type: eventEditForm.type,
          startsAt,
          location: eventEditForm.location.trim() || null,
          address: eventEditForm.address.trim() || null,
          requiresSeatingPlan: eventEditForm.requiresSeatingPlan,
        }),
      });
      if (!response.ok) throw new Error("event_save_failed");

      const json = (await response.json()) as WeddingEventApiResponse;
      const startsAtDate = json.event.startsAt ? new Date(json.event.startsAt) : null;
      setData((current) => ({
        ...current,
        event: {
          ...current.event,
          name: json.event.name,
          type: mapEventType(json.event.type),
          requiresSeatingPlan: json.event.requiresSeatingPlan,
          isMainEvent: json.event.type === "wedding",
          date: startsAtDate ? toDateString(startsAtDate) : current.event.date,
          startTime: startsAtDate ? toTimeString(startsAtDate) : current.event.startTime,
          venue: {
            name: json.event.location?.trim() || current.event.venue.name,
            address: json.event.address?.trim() || "-",
          },
        },
      }));
      closeEditEventDialog();
    } catch {
      setEventEditError(t("events.list.editDialog.saveFailed"));
    } finally {
      setIsSavingEvent(false);
    }
  };

  const onCreatePlan = async () => {
    if (!canEditWedding) return;

    setIsCreatingPlan(true);
    setError(null);
    const nextPlanName = `${t("plans.newPlanPrefix")} ${data.seatingPlans.length + 1}`;

    try {
      const response = await fetch("/api/seating-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextPlanName,
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
      setActiveTabWithUrl("seating");
    } catch {
      setError(t("events.detail.states.createPlanError"));
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const loadTimelineItems = async () => {
    const response = await fetch(`/api/weddings/${weddingId}/events/${eventId}/timeline-items`, { cache: "no-store" });
    if (!response.ok) throw new Error(t("events.detail.scheduleTab.errors.load"));
    const json = (await response.json()) as TimelineItemsApiResponse;
    setTimelineItems(json.items);
  };

  const openCreateTimelineDialog = () => {
    setTimelineForm({ ...emptyTimelineForm, sortOrder: String(timelineItems.length) });
    setEditingTimelineItemId(null);
    setTimelineError(null);
    setTimelineDialogMode("create");
  };

  const openEditTimelineDialog = (item: EventTimelineItem) => {
    setTimelineForm({
      time: item.time,
      title: item.title,
      notes: item.notes ?? "",
      sortOrder: String(item.sortOrder),
      completed: item.completed,
    });
    setEditingTimelineItemId(item.id);
    setTimelineError(null);
    setTimelineDialogMode("edit");
  };

  const saveTimelineItem = async () => {
    if (!canEditWedding || !timelineDialogMode) return;
    const sortOrder = Number.parseInt(timelineForm.sortOrder, 10);
    if (!timelineForm.time.trim() || !timelineForm.title.trim() || !Number.isFinite(sortOrder) || sortOrder < 0) {
      setTimelineError(t("events.detail.scheduleTab.errors.invalidForm"));
      return;
    }

    setIsSavingTimelineItem(true);
    setTimelineError(null);
    try {
      const payload = {
        time: timelineForm.time.trim(),
        title: timelineForm.title.trim(),
        notes: timelineForm.notes.trim() || null,
        sortOrder,
        completed: timelineForm.completed,
      };
      const url = timelineDialogMode === "edit" && editingTimelineItemId
        ? `/api/weddings/${weddingId}/events/${eventId}/timeline-items/${editingTimelineItemId}`
        : `/api/weddings/${weddingId}/events/${eventId}/timeline-items`;
      const response = await fetch(url, {
        method: timelineDialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("events.detail.scheduleTab.errors.save"));
      await loadTimelineItems();
      setTimelineDialogMode(null);
    } catch (saveError) {
      setTimelineError(saveError instanceof Error ? saveError.message : t("events.detail.scheduleTab.errors.save"));
    } finally {
      setIsSavingTimelineItem(false);
    }
  };

  const deleteTimelineItem = async () => {
    if (!canEditWedding || !deleteTimelineItemId) return;
    const response = await fetch(`/api/weddings/${weddingId}/events/${eventId}/timeline-items/${deleteTimelineItemId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(t("events.detail.scheduleTab.errors.delete"));
    await loadTimelineItems();
    setDeleteTimelineItemId(null);
  };

  const localeName = toIntlLocale(locale as Locale);
  const eventDateLabel = formatEventDate(data.event.date, localeName);
  const eventTimeLabel = data.event.startTime;

  const budgetSpentPercent =
    data.event.budget.total > 0 ? Math.min(100, Math.round((data.event.budget.spent / data.event.budget.total) * 100)) : 0;

  const attendancePercent =
    data.event.guests.total > 0 ? Math.round((data.event.guests.confirmed / data.event.guests.total) * 100) : 0;
  const timelineItemPendingDelete = timelineItems.find((item) => item.id === deleteTimelineItemId) ?? null;

  if (isLoading) {
    return <WeddingEventDetailPageLoading />;
  }

  return (
    <>
      <WorkspacePageHeader
        title={(
          <span className="flex flex-wrap items-center gap-3">
            <span>{data.event.name}</span>
            {data.event.isMainEvent ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                {t("events.detail.badges.mainEvent")}
              </Badge>
            ) : null}
          </span>
        )}
        subtitle={(
          <span className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
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
          </span>
        )}
        actions={(
          <>
            <Button type="button" variant="outline" size="icon" aria-label={t("dashboard.header.notifications")}>
              <Bell className="size-4" />
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(weddingRoutes.guests)}>
              {t("events.detail.actions.guestPreview")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={openEditEventDialog}
              disabled={!canEditWedding}
            >
              <Edit3 className="size-4" />
              {t("events.detail.actions.editEvent")}
            </Button>
          </>
        )}
      />
      <div className="mt-5 flex flex-col gap-5">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTabWithUrl(value as EventTabId)}>
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-zinc-200 bg-transparent p-0">
            {eventTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-violet-500 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none"
                >
                  <Icon className="mr-2 size-4" />
                  {t(tab.key)}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

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
                            <span className="absolute bottom-[-22px] top-3 z-0 w-px bg-violet-200" />
                          ) : null}
                          <span className="relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500 shadow-[0_0_0_1px_rgba(124,58,237,0.35)]" />
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
                      <LegendRow colorClass="text-red-500" label={t("events.detail.cards.guests.notAttending")} value={data.event.guests.notAttending} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full"
                    onClick={() => router.push(weddingRoutes.guests)}
                  >
                    {t("events.detail.actions.manageEventGuests")}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="gap-0">
                <CardHeader className="items-center">
                  <CardTitle>{t("events.detail.cards.vendors.title")}</CardTitle>
                  <Link href={weddingRoutes.vendors} className="text-sm text-zinc-600 hover:text-zinc-900">
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
                    onClick={() => router.push(weddingRoutes.budget)}
                  >
                    {t("events.detail.actions.viewBudget")}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="gap-0">
                <CardHeader className="items-center">
                  <CardTitle>{t("events.detail.cards.tasks.title")}</CardTitle>
                  <Button type="button" variant="ghost" onClick={() => setActiveTabWithUrl("schedule")}>
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

              <AppQuickActionsCard
                title={t("events.detail.cards.quickActions.title")}
                actions={[
                  {
                    id: "timeline",
                    label: t("events.detail.actions.addTimelineItem"),
                    action: <Button type="button" variant="outline" className="w-full" onClick={() => undefined}>{t("events.detail.actions.addTimelineItem")}</Button>,
                  },
                  {
                    id: "task",
                    label: t("events.detail.actions.addTask"),
                    action: <Button type="button" variant="outline" className="w-full" onClick={() => undefined}>{t("events.detail.actions.addTask")}</Button>,
                  },
                  {
                    id: "vendor",
                    label: t("events.detail.actions.addVendor"),
                    action: <Button type="button" variant="outline" className="w-full" onClick={() => undefined}>{t("events.detail.actions.addVendor")}</Button>,
                  },
                  {
                    id: "expense",
                    label: t("events.detail.actions.addExpense"),
                    action: <Button type="button" variant="outline" className="w-full" onClick={() => undefined}>{t("events.detail.actions.addExpense")}</Button>,
                  },
                  {
                    id: "seating",
                    label: t("events.detail.actions.openSeatingPlan"),
                    action: (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          if (seatingPlanHref) {
                            router.push(seatingPlanHref);
                            return;
                          }
                          setActiveTabWithUrl("seating");
                        }}
                      >
                        {t("events.detail.actions.openSeatingPlan")}
                        <ExternalLink className="size-4" />
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        ) : null}

        {activeTab === "schedule" ? (
          <Card className="gap-0">
            <CardHeader>
              <div>
                <CardTitle>{t("events.detail.scheduleTab.title")}</CardTitle>
                <CardDescription>{t("events.detail.scheduleTab.description")}</CardDescription>
              </div>
              <CardAction>
                <Button type="button" variant="primary" onClick={openCreateTimelineDialog} disabled={!canEditWedding}>
                  <Plus className="size-4" />
                  {t("events.detail.scheduleTab.add")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {timelineItems.length ? (
                <div className="space-y-1">
                  {timelineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[72px_18px_minmax(0,1fr)_80px] items-start gap-3 py-3">
                      <p className="pt-0.5 text-lg font-medium leading-none text-zinc-900">{item.time}</p>
                      <div className="relative flex h-full justify-center">
                        {index < timelineItems.length - 1 ? <span className="absolute bottom-[-18px] top-3 w-px bg-violet-200" /> : null}
                        <span className="relative mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500 shadow-[0_0_0_1px_rgba(124,58,237,0.35)]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900">{item.title}</p>
                          {item.completed ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t("events.detail.scheduleTab.completed")}</Badge> : null}
                        </div>
                        {item.notes ? <p className="mt-1 text-sm text-zinc-600">{item.notes}</p> : null}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEditTimelineDialog(item)} disabled={!canEditWedding} aria-label={t("events.detail.scheduleTab.edit")}>
                          <Edit3 className="size-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteTimelineItemId(item.id)} disabled={!canEditWedding} aria-label={t("events.detail.scheduleTab.delete")}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">{t("events.detail.scheduleTab.empty")}</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "seating" ? (
          <section className="pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                  {t("events.detail.seatingTab.title")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {t("events.detail.seatingTab.openOrCreateDescription")}
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                className="h-10 self-start"
                onClick={onCreatePlan}
                disabled={!canEditWedding || isCreatingPlan}
              >
                <Plus className="size-4" />
                {isCreatingPlan ? t("events.detail.seatingTab.creating") : t("events.detail.seatingTab.create")}
              </Button>
            </div>

            <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
              {data.seatingPlans.length ? (
                data.seatingPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={weddingRoutes.seatingPlan(plan.id)}
                    className="group grid gap-4 py-5 transition-colors hover:bg-zinc-50/70 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:px-3"
                  >
                    <SeatingPlanThumbnail name={plan.name} />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-zinc-950">{plan.name}</p>
                      <p className="mt-1 text-sm text-zinc-600">{plan.width} x {plan.height}</p>
                    </div>
                    <span className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 shadow-xs transition-colors group-hover:bg-zinc-100">
                      {t("events.detail.seatingTab.open")}
                      <ExternalLink className="size-4 text-zinc-500" />
                    </span>
                  </Link>
                ))
              ) : (
                <div className="py-8">
                  <p className="text-sm text-zinc-600">{t("events.detail.seatingTab.empty")}</p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab !== "overview" && activeTab !== "seating" && activeTab !== "schedule" ? (
          <Card className="gap-0">
            <CardHeader>
              <CardTitle>{t("events.detail.tabs.placeholderTitle")}</CardTitle>
              <CardDescription>{t("events.detail.tabs.placeholderDescription", { tab: t(`events.detail.tabs.${activeTab}`) })}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveTabWithUrl("overview")}
              >
                {t("events.detail.tabs.backToOverview")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={isEditEventOpen} onOpenChange={(open) => !open && closeEditEventDialog()}>
        <DialogContent className="sm:max-w-[760px] p-0" closeLabel={t("common.close")}>
          <DialogHeader className="border-b border-zinc-200 px-6 py-5">
            <DialogTitle>{t("events.list.actions.edit")}</DialogTitle>
          </DialogHeader>
          {eventEditForm ? (
            <form
              className="grid gap-4 px-6 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                void saveEvent();
              }}
            >
              <div className="grid gap-2">
                <label htmlFor="detail-edit-event-name" className="text-sm font-medium">{t("events.list.table.name")}</label>
                <Input
                  id="detail-edit-event-name"
                  value={eventEditForm.name}
                  onChange={(event) => setEventEditForm((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder={t("events.list.editDialog.namePlaceholder")}
                />
              </div>
              <div className="grid gap-2 max-w-[220px]">
                <label htmlFor="detail-edit-event-type" className="text-sm font-medium">{t("events.detail.cards.snapshot.fields.type")}</label>
                <Select
                  value={eventEditForm.type}
                  onValueChange={(value) =>
                    setEventEditForm((current) => current ? { ...current, type: value as WeddingEventApiType } : current)
                  }
                >
                  <SelectTrigger id="detail-edit-event-type" aria-label={t("events.detail.cards.snapshot.fields.type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{t(option.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label
                htmlFor="detail-edit-event-requires-seating-plan"
                className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 px-3 py-3"
              >
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium text-zinc-900">{t("events.list.form.requiresSeatingPlan")}</span>
                  <span className="text-xs leading-5 text-zinc-500">{t("events.list.form.requiresSeatingPlanHelp")}</span>
                </span>
                <Switch
                  id="detail-edit-event-requires-seating-plan"
                  checked={eventEditForm.requiresSeatingPlan}
                  onCheckedChange={(checked) =>
                    setEventEditForm((current) => current ? { ...current, requiresSeatingPlan: checked } : current)
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <EventDatePicker
                  label={t("events.list.table.date")}
                  value={eventEditForm.date}
                  locale={locale}
                  placeholder={t("events.list.form.datePlaceholder")}
                  clearLabel={t("events.list.form.clearDate")}
                  onChange={(date) => setEventEditForm((current) => current ? { ...current, date } : current)}
                />
                <div className="grid gap-2">
                  <label htmlFor="detail-edit-event-time" className="text-sm font-medium">{t("events.detail.cards.snapshot.fields.time")}</label>
                  <Input
                    id="detail-edit-event-time"
                    type="time"
                    value={eventEditForm.time}
                    onChange={(event) => setEventEditForm((current) => current ? { ...current, time: event.target.value } : current)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="detail-edit-event-location" className="text-sm font-medium">{t("events.list.table.location")}</label>
                <Input
                  id="detail-edit-event-location"
                  value={eventEditForm.location}
                  onChange={(event) => setEventEditForm((current) => current ? { ...current, location: event.target.value } : current)}
                  placeholder={t("events.list.editDialog.locationPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="detail-edit-event-address" className="text-sm font-medium">{t("events.list.table.address")}</label>
                <Input
                  id="detail-edit-event-address"
                  value={eventEditForm.address}
                  onChange={(event) => setEventEditForm((current) => current ? { ...current, address: event.target.value } : current)}
                  placeholder={t("events.list.editDialog.addressPlaceholder")}
                />
              </div>
              {eventEditError ? <p className="text-sm text-red-600">{eventEditError}</p> : null}
              <DialogFooter className="mt-1 border-t border-zinc-200 pt-4">
                <Button type="button" variant="outline" onClick={closeEditEventDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={isSavingEvent}>
                  {isSavingEvent ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={timelineDialogMode !== null} onOpenChange={(open) => !open && setTimelineDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{timelineDialogMode === "edit" ? t("events.detail.scheduleTab.editTitle") : t("events.detail.scheduleTab.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTimelineItem();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)_120px]">
              <Input value={timelineForm.time} onChange={(event) => setTimelineForm((current) => ({ ...current, time: event.target.value }))} placeholder={t("events.detail.scheduleTab.form.time")} />
              <Input value={timelineForm.title} onChange={(event) => setTimelineForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("events.detail.scheduleTab.form.title")} />
              <Input value={timelineForm.sortOrder} onChange={(event) => setTimelineForm((current) => ({ ...current, sortOrder: event.target.value }))} placeholder={t("events.detail.scheduleTab.form.sortOrder")} />
            </div>
            <Input value={timelineForm.notes} onChange={(event) => setTimelineForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("events.detail.scheduleTab.form.notes")} />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <Checkbox checked={timelineForm.completed} onCheckedChange={(checked) => setTimelineForm((current) => ({ ...current, completed: checked === true }))} />
              {t("events.detail.scheduleTab.form.completed")}
            </label>
            {timelineError ? <p className="text-sm text-red-600">{timelineError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTimelineDialogMode(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="primary" disabled={isSavingTimelineItem}>{isSavingTimelineItem ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTimelineItemId !== null}
        onOpenChange={(open) => !open && setDeleteTimelineItemId(null)}
        title={t("events.detail.scheduleTab.deleteTitle")}
        description={timelineItemPendingDelete ? t("events.detail.scheduleTab.deleteDescription", { title: timelineItemPendingDelete.title }) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={deleteTimelineItem}
      />
    </>
  );
}

function EventDatePicker({
  label,
  value,
  locale,
  placeholder,
  clearLabel,
  onChange,
}: {
  label: string;
  value: string;
  locale: string;
  placeholder: string;
  clearLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateInputValue(value);

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={label}
            className={cn(
              "h-9 w-full justify-between px-3 text-left font-normal",
              !selectedDate && "text-zinc-400",
            )}
          >
            <span className="min-w-0 truncate">
              {selectedDate ? formatEventFormDate(selectedDate, locale) : placeholder}
            </span>
            <CalendarDays className="size-4 text-zinc-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateString(date));
              setOpen(false);
            }}
            defaultMonth={selectedDate}
            locale={locale === "pl" ? pl : enUS}
          />
          <div className="border-t border-zinc-200 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {clearLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function parseDateInputValue(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
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

function SeatingPlanThumbnail({ name }: { name: string }) {
  return (
    <div
      aria-label={name}
      className="relative h-24 w-24 overflow-hidden rounded-md border border-zinc-200 bg-white"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(212,212,216,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(212,212,216,0.5)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <span className="absolute left-5 top-5 h-3 w-10 rounded-sm bg-zinc-200" />
      <span className="absolute bottom-5 right-5 h-3 w-10 rounded-sm bg-violet-300" />
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
  weddingLocation: string | null,
): WeddingEventDetail {
  const confirmedGuests = guests.filter((guest) => guest.rsvpStatus === "confirmed").length;
  const pendingGuests = guests.filter((guest) => guest.rsvpStatus === "unknown" || guest.rsvpStatus === "maybe").length;
  const declinedGuests = guests.filter((guest) => guest.rsvpStatus === "declined").length;
  const guestsTotal = guests.length || base.guests.total;

  const eventExpenses = expenses.filter(
    (expense) => expense.eventId === eventId && expense.status !== "canceled" && expense.status !== "reimbursed",
  );
  const trackedAmount = eventExpenses.reduce((sum, item) => sum + item.amountMinor, 0) / 100;
  const paidAmount = eventExpenses
    .filter((expense) => expense.status === "paid")
    .reduce((sum, item) => sum + item.amountMinor, 0) / 100;

  const eventVendors = vendors.filter((vendor) => vendor.vendorEvents.some((relation) => relation.eventId === eventId));
  const mappedVendors: WeddingEventDetail["vendors"] = eventVendors.slice(0, 4).map((vendor, index) => ({
    id: vendor.id,
    categoryKey: categoryKeys[index] ?? "events.detail.vendors.category.vendor",
    name: vendor.name,
    status: vendor.lifecycleStatus === "considering" || vendor.lifecycleStatus === "canceled" ? "pending" : "confirmed",
  }));

  const firstPlan = plans[0];
  const totalPlanSeats = firstPlan ? firstPlan.tables.reduce((sum, table) => sum + table.seatCount, 0) : base.seating.total;
  const seatedGuests = Math.min(guestsTotal, confirmedGuests || base.seating.seated);
  const unseatedGuests = Math.max(0, guestsTotal - seatedGuests);
  const warnings = Math.max(0, guestsTotal - totalPlanSeats);

  const startsAtDate = event.startsAt ? new Date(event.startsAt) : null;
  const eventLocation = event.location?.trim() || null;
  const eventAddress = event.address?.trim() || null;
  const weddingVenueLocation = event.type === "wedding" ? weddingLocation?.trim() || null : null;
  const venueLocation = weddingVenueLocation ?? eventLocation;

  return {
    ...base,
    name: event.name || base.name,
    type: mapEventType(event.type),
    requiresSeatingPlan: event.requiresSeatingPlan,
    isMainEvent: event.type === "wedding",
    date: startsAtDate ? toDateString(startsAtDate) : base.date,
    startTime: startsAtDate ? toTimeString(startsAtDate) : base.startTime,
    venue: {
      name: venueLocation ?? base.venue.name,
      address: eventAddress ?? "-",
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
      total: trackedAmount,
      spent: paidAmount,
    },
    vendors: mappedVendors.length ? mappedVendors : base.vendors,
    notes: event.notes ? [event.notes, ...base.notes] : base.notes,
  };
}

function mapEventType(value: WeddingEventApiResponse["event"]["type"]): WeddingEventDetail["type"] {
  if (value === "other") return "custom";
  return value;
}

function mapDetailTypeToApi(value: WeddingEventDetail["type"]): WeddingEventApiType {
  if (value === "custom") return "other";
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

function formatEventFormDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}




