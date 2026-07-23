"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";
import { getEventRoutes } from "@/lib/routes";
import { WeddingEventListRow } from "@/features/wedding-events/components/WeddingEventListRow";
import { mapWeddingEventListItem } from "@/features/wedding-events/lib/map-wedding-event-list-item";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WeddingEventsListPageProps = {
  embedded?: boolean;
  weddingId: string;
  nowIso: string;
  events: Array<{
    id: string;
    name: string;
    type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
    date: string;
    time: string;
    location: string;
    address: string;
  }>({
    name: "",
    type: "other",
    date: "",
    time: "",
    location: "",
    address: "",
  });

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
    });
    setEditError(null);
    setEditingEventId(eventId);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
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
        startsAt,
      };

      const response = await fetch(`/api/weddings/${weddingId}/events/${editingEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("update_failed");
      }

      const result = (await response.json()) as {
        event: {
          id: string;
          name: string;
          type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
          startsAt: string | null;
          location: string | null;
          address: string | null;
        };
      };

      setEventsState((current) =>
        current.map((event) =>
          event.id === result.event.id
            ? {
                ...event,
                name: result.event.name,
                type: result.event.type,
                startsAt: result.event.startsAt,
                location: result.event.location,
                address: result.event.address,
              }
            : event,
        ),
      );

      setEditingEventId(null);
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
          <Button type="button" variant="primary" disabled>
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

        <div className="mt-4 max-w-md">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("events.list.searchPlaceholder")}
          />
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
                seatingPlansLabel={t("events.list.row.seatingPlans", { count: event.seatingPlanCount })}
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

      <Dialog open={editingEventId !== null} onOpenChange={(open) => !open && setEditingEventId(null)}>
        <DialogContent className="sm:max-w-[760px] p-0">
          <DialogHeader className="border-b border-zinc-200 px-6 py-5">
            <DialogTitle>{t("events.list.actions.edit")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 px-6 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEdit();
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
                    type: value as "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other",
                  }))
                }
              >
                <SelectTrigger id="edit-event-type" aria-label={t("events.detail.cards.snapshot.fields.type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">{t("events.detail.eventType.wedding")}</SelectItem>
                  <SelectItem value="afterparty">{t("events.detail.eventType.afterparty")}</SelectItem>
                  <SelectItem value="bachelor">{t("events.detail.eventType.bachelor")}</SelectItem>
                  <SelectItem value="bachelorette">{t("events.detail.eventType.bachelorette")}</SelectItem>
                  <SelectItem value="other">{t("events.detail.eventType.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="edit-event-date" className="text-sm font-medium">{t("events.list.table.date")}</label>
                <Input
                  id="edit-event-date"
                  type="date"
                  value={editForm.date}
                  onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))}
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
              <Button type="button" variant="outline" onClick={() => setEditingEventId(null)}>
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

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
