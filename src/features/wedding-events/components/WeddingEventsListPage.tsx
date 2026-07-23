"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { enUS, pl } from "react-day-picker/locale";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";
import { getEventRoutes } from "@/lib/routes";
import { WeddingEventListRow } from "@/features/wedding-events/components/WeddingEventListRow";
import { mapWeddingEventListItem } from "@/features/wedding-events/lib/map-wedding-event-list-item";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WeddingEventType = "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";

type EventFormState = {
  name: string;
  type: WeddingEventType;
  date: string;
  time: string;
  location: string;
  address: string;
  requiresSeatingPlan: boolean;
};

const emptyEventForm: EventFormState = {
  name: "",
  type: "other",
  date: "",
  time: "",
  location: "",
  address: "",
  requiresSeatingPlan: true,
};

const eventTypeOptions: Array<{ value: WeddingEventType; labelKey: string }> = [
  { value: "wedding", labelKey: "events.detail.eventType.wedding" },
  { value: "ceremony", labelKey: "events.detail.eventType.ceremony" },
  { value: "afterparty", labelKey: "events.detail.eventType.afterparty" },
  { value: "bachelor", labelKey: "events.detail.eventType.bachelor" },
  { value: "bachelorette", labelKey: "events.detail.eventType.bachelorette" },
  { value: "other", labelKey: "events.detail.eventType.custom" },
];

type WeddingEventsListPageProps = {
  embedded?: boolean;
  weddingId: string;
  nowIso: string;
  events: Array<{
    id: string;
    name: string;
    type: WeddingEventType;
    requiresSeatingPlan: boolean;
    startsAt: string | null;
    location: string | null;
    address: string | null;
    _count: {
      eventGuests: number;
      seatingPlans: number;
      vendorEvents: number;
    };
    eventGuests: Array<{
      rsvpStatus: "unknown" | "confirmed" | "declined" | "maybe";
    }>;
  }>;
};

export function WeddingEventsListPage({ embedded = false, weddingId, nowIso, events }: WeddingEventsListPageProps) {
  const { t, locale } = useI18n();
  const [eventsState, setEventsState] = useState(events);
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [query, setQuery] = useState("");
  const [eventDialogMode, setEventDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventFormState>(emptyEventForm);

  const nowTs = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  const mappedEvents = useMemo(
    () =>
      eventsState.map((event) => {
        const confirmedCount = event.eventGuests.filter((guest) => guest.rsvpStatus === "confirmed").length;
        const respondedCount = event.eventGuests.filter((guest) => guest.rsvpStatus !== "unknown").length;
        return mapWeddingEventListItem({
          id: event.id,
          name: event.name,
          type: event.type,
          startsAt: event.startsAt,
          location: event.location,
          address: event.address,
          guestCount: event._count.eventGuests,
          confirmedCount,
          respondedCount,
          seatingPlanCount: event._count.seatingPlans,
          requiresSeatingPlan: event.requiresSeatingPlan,
          vendorCount: event._count.vendorEvents,
          locale,
        });
      }),
    [eventsState, locale],
  );

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return mappedEvents.filter((event) => {
      const startsAtMs = event.startsAt ? new Date(event.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const statusMatch =
        statusFilter === "all"
          ? true
          : statusFilter === "upcoming"
            ? startsAtMs >= nowTs
            : startsAtMs < nowTs;

      if (!statusMatch) return false;
      if (!normalizedQuery) return true;

      const haystack = `${event.name} ${event.location ?? ""} ${event.address ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [mappedEvents, nowTs, query, statusFilter]);

  const highlightedEventId = useMemo(() => {
    const upcomingEvents = visibleEvents
      .filter((event) => event.startsAt && new Date(event.startsAt).getTime() >= nowTs)
      .sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime());

    const mainUpcoming = upcomingEvents.find((event) => event.isMainEvent);
    return mainUpcoming?.id ?? upcomingEvents[0]?.id ?? null;
  }, [visibleEvents, nowTs]);

  const editingEvent = useMemo(
    () => eventsState.find((event) => event.id === editingEventId) ?? null,
    [eventsState, editingEventId],
  );

  const closeEventDialog = () => {
    setEventDialogMode(null);
    setEditingEventId(null);
    setEditError(null);
    setEditForm(emptyEventForm);
  };

  const openCreateDialog = () => {
    setEditForm(emptyEventForm);
    setEditError(null);
    setEditingEventId(null);
    setEventDialogMode("create");
  };

  const openEditDialog = (eventId: string) => {
    const event = eventsState.find((item) => item.id === eventId);
    if (!event) return;

    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    setEditForm({
      name: event.name,
      type: event.type,
      date: startsAt ? toDateInputValue(startsAt) : "",
      time: startsAt ? toTimeInputValue(startsAt) : "",
      location: event.location ?? "",
      address: event.address ?? "",
      requiresSeatingPlan: event.requiresSeatingPlan,
    });
    setEditError(null);
    setEditingEventId(eventId);
    setEventDialogMode("edit");
  };

  const handleSaveEvent = async () => {
    if (eventDialogMode === "edit" && !editingEvent) return;
    if (!editForm.name.trim()) {
      setEditError(t("events.list.editDialog.nameRequired"));
      return;
    }

    if ((editForm.date && !editForm.time) || (!editForm.date && editForm.time)) {
      setEditError(t("events.list.editDialog.dateTimePairRequired"));
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const startsAt = editForm.date && editForm.time
        ? new Date(`${editForm.date}T${editForm.time}`).toISOString()
        : null;

      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
        type: editForm.type,
        location: editForm.location.trim() ? editForm.location.trim() : null,
        address: editForm.address.trim() ? editForm.address.trim() : null,
        requiresSeatingPlan: editForm.requiresSeatingPlan,
        startsAt,
      };

      const response = await fetch(
        eventDialogMode === "edit" && editingEvent
          ? `/api/weddings/${weddingId}/events/${editingEvent.id}`
          : `/api/weddings/${weddingId}/events`,
        {
          method: eventDialogMode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("update_failed");
      }

      const result = (await response.json()) as {
        event: {
          id: string;
          name: string;
          type: WeddingEventType;
          requiresSeatingPlan: boolean;
          startsAt: string | null;
          location: string | null;
          address: string | null;
          _count?: {
            eventGuests: number;
            seatingPlans: number;
            vendorEvents: number;
          };
          eventGuests?: Array<{
            rsvpStatus: "unknown" | "confirmed" | "declined" | "maybe";
          }>;
        };
      };

      if (eventDialogMode === "edit") {
        setEventsState((current) =>
          current.map((event) =>
            event.id === result.event.id
              ? {
                  ...event,
                  name: result.event.name,
                  type: result.event.type,
                  requiresSeatingPlan: result.event.requiresSeatingPlan,
                  startsAt: result.event.startsAt,
                  location: result.event.location,
                  address: result.event.address,
                }
              : event,
          ),
        );
      } else {
        setEventsState((current) => [
          ...current,
          {
            id: result.event.id,
            name: result.event.name,
            type: result.event.type,
            requiresSeatingPlan: result.event.requiresSeatingPlan,
            startsAt: result.event.startsAt,
            location: result.event.location,
            address: result.event.address,
            _count: result.event._count ?? {
              eventGuests: 0,
              seatingPlans: 0,
              vendorEvents: 0,
            },
            eventGuests: result.event.eventGuests ?? [],
          },
        ]);
      }

      closeEventDialog();
    } catch {
      setEditError(t("events.list.editDialog.saveFailed"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <AppWorkspacePage as={embedded ? "div" : "main"} className={embedded ? "contents" : undefined}>
      {!embedded ? <WeddingPageHeader
        title={t("events.list.title")}
        subtitle={t("events.list.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog}>
            <Plus className="size-4" />
            {t("events.actions.addEvent")}
          </Button>
        )}
      /> : null}

      <div className="mt-5">
        <AppStatsRail
          items={[
            {
              label: t("events.list.coverage.guests"),
              value: eventsState.reduce((sum, event) => sum + event._count.eventGuests, 0),
            },
            {
              label: t("events.list.coverage.responded"),
              value: eventsState.reduce(
                (sum, event) => sum + event.eventGuests.filter((guest) => guest.rsvpStatus !== "unknown").length,
                0,
              ),
            },
            {
              label: t("events.list.coverage.seatingPlans"),
              value: eventsState.reduce((sum, event) => sum + event._count.seatingPlans, 0),
            },
            {
              label: t("events.list.coverage.vendors"),
              value: eventsState.reduce((sum, event) => sum + event._count.vendorEvents, 0),
            },
          ]}
        />

        <div className="mt-5">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "upcoming" | "completed")}>
          <TabsList className="h-auto justify-start gap-1 rounded-none border-b border-zinc-200 bg-transparent p-0">
            <TabsTrigger value="all" className="h-10 rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-violet-500 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none">{t("events.list.filters.all")}</TabsTrigger>
            <TabsTrigger value="upcoming" className="h-10 rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-violet-500 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none">{t("events.list.filters.upcoming")}</TabsTrigger>
            <TabsTrigger value="completed" className="h-10 rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-violet-500 data-[state=active]:bg-transparent data-[state=active]:text-violet-600 data-[state=active]:shadow-none">{t("events.list.filters.completed")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-md">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("events.list.searchPlaceholder")}
            />
          </div>
          {embedded ? (
            <Button type="button" variant="primary" className="self-start" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {t("events.actions.addEvent")}
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <WeddingEventListRow
                key={event.id}
                event={event}
                href={getEventRoutes(weddingId, event.id).root}
                guestsLabel={t("events.list.row.guests")}
                confirmedLabel={t("events.list.row.confirmed")}
                confirmedRatioLabel={t("events.list.row.confirmedRatio", {
                  confirmed: event.confirmedCount,
                  percent: event.confirmedPercent,
                })}
                respondedLabel={t("events.list.row.respondedRatio", {
                  responded: event.respondedCount,
                  percent: event.respondedPercent,
                })}
                seatingPlansLabel={
                  event.requiresSeatingPlan
                    ? t("events.list.row.seatingPlans", { count: event.seatingPlanCount })
                    : t("events.list.row.noSeatingRequired")
                }
                vendorsLabel={t("events.list.row.vendors", { count: event.vendorCount })}
                nextActionLabel={t(`events.list.coverage.nextAction.${event.coverageStatus}`)}
                openLabel={t("events.list.actions.open")}
                editLabel={t("events.list.actions.edit")}
                deleteLabel={t("events.list.actions.delete")}
                onEdit={() => openEditDialog(event.id)}
                highlighted={event.id === highlightedEventId}
              />
            ))
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">{t("events.list.states.emptyTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">{t("events.list.states.emptySubtitle")}</p>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </div>

      <Dialog open={eventDialogMode !== null} onOpenChange={(open) => !open && closeEventDialog()}>
        <DialogContent className="sm:max-w-[760px] p-0">
          <DialogHeader className="border-b border-zinc-200 px-6 py-5">
            <DialogTitle>
              {eventDialogMode === "edit" ? t("events.list.actions.edit") : t("events.list.createDialog.title")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 px-6 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEvent();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor="edit-event-name" className="text-sm font-medium">{t("events.list.table.name")}</label>
              <Input
                id="edit-event-name"
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("events.list.editDialog.namePlaceholder")}
              />
            </div>
            <div className="grid gap-2 max-w-[220px]">
              <label htmlFor="edit-event-type" className="text-sm font-medium">{t("events.detail.cards.snapshot.fields.type")}</label>
              <Select
                value={editForm.type}
                onValueChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    type: value as WeddingEventType,
                  }))
                }
              >
                <SelectTrigger id="edit-event-type" aria-label={t("events.detail.cards.snapshot.fields.type")}>
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
              htmlFor="edit-event-requires-seating-plan"
              className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 px-3 py-3"
            >
              <span className="grid gap-0.5">
                <span className="text-sm font-medium text-zinc-900">{t("events.list.form.requiresSeatingPlan")}</span>
                <span className="text-xs leading-5 text-zinc-500">{t("events.list.form.requiresSeatingPlanHelp")}</span>
              </span>
              <Switch
                id="edit-event-requires-seating-plan"
                checked={editForm.requiresSeatingPlan}
                onCheckedChange={(checked) =>
                  setEditForm((current) => ({ ...current, requiresSeatingPlan: checked }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <EventDatePicker
                  label={t("events.list.table.date")}
                  value={editForm.date}
                  locale={locale}
                  placeholder={t("events.list.form.datePlaceholder")}
                  clearLabel={t("events.list.form.clearDate")}
                  onChange={(date) => setEditForm((current) => ({ ...current, date }))}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-event-time" className="text-sm font-medium">{t("events.detail.cards.snapshot.fields.time")}</label>
                <Input
                  id="edit-event-time"
                  type="time"
                  value={editForm.time}
                  onChange={(event) => setEditForm((current) => ({ ...current, time: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-event-location" className="text-sm font-medium">{t("events.list.table.location")}</label>
              <Input
                id="edit-event-location"
                value={editForm.location}
                onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))}
                placeholder={t("events.list.editDialog.locationPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-event-address" className="text-sm font-medium">{t("events.list.table.address")}</label>
              <Input
                id="edit-event-address"
                value={editForm.address}
                onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))}
                placeholder={t("events.list.editDialog.addressPlaceholder")}
              />
            </div>
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            <DialogFooter className="mt-1 border-t border-zinc-200 pt-4">
              <Button type="button" variant="outline" onClick={closeEventDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingEdit}>
                {isSavingEdit ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppWorkspacePage>
  );
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
              {selectedDate ? formatDate(selectedDate, locale) : placeholder}
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
              onChange(toDateInputValue(date));
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

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
