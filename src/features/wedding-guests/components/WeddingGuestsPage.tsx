"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/features/wedding-dashboard/lib/formatting";
import { WorkspaceStatsSkeleton } from "@/features/wedding-dashboard/components/WorkspacePageLoading";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { buildWeddingGuestsMockData, deriveGuestStats } from "../guests.mock";
import type { GuestAgeCategory, GuestRsvpStatus, GuestSex, WeddingGuest, WeddingGuestsData, WeddingGuestEvent } from "../types";
import { AddGuestDialog } from "./AddGuestDialog";
import { GuestManagementTable } from "./GuestManagementTable";
import { GuestTipCard } from "./GuestTipCard";
import { GuestsPageHeader } from "./GuestsPageHeader";
import { GuestStatsCards } from "./GuestStatsCards";
import { getWeddingRoutes } from "@/lib/routes";

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
    events: Array<{
      id: string;
      name: string;
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
      startsAt: string | null;
    }>;
  };
};

type WeddingGuestsApiGuest = {
  id: string;
  name: string;
  sex: GuestSex;
  ageCategory: GuestAgeCategory;
  guardianGuestId: string | null;
  notes: string | null;
  plusOneHostGuestId: string | null;
  relationshipMembers: Array<{
    relationshipId: string;
  }>;
  eventGuests: Array<{
    eventId: string;
    rsvpStatus: "unknown" | "confirmed" | "declined" | "maybe";
    requiresSeat: boolean;
    notes: string | null;
    event: {
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
    };
  }>;
};

type WeddingGuestsApiResponse = {
  guests: WeddingGuestsApiGuest[];
};

type WeddingGuestsPageProps = {
  weddingId: string;
};

type WeddingEventType = "wedding" | "afterparty" | "bachelorette" | "bachelor" | "other";

export function WeddingGuestsPage({ weddingId }: WeddingGuestsPageProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const baseData = useMemo(() => buildWeddingGuestsMockData(weddingId), [weddingId]);
  const routes = useMemo(() => getWeddingRoutes(weddingId), [weddingId]);

  const [data, setData] = useState<WeddingGuestsData>({
    ...baseData,
    guests: [],
    stats: {
      totalGuests: 0,
      confirmed: 0,
      pending: 0,
      notAttending: 0,
      noResponse: 0,
      deltaSinceUpdate: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [availableEvents, setAvailableEvents] = useState<Array<{ id: string; name: string; type: WeddingEventType }>>([]);
  const [linkableGuests, setLinkableGuests] = useState<Array<{ id: string; name: string }>>([]);
  const [canEditWedding, setCanEditWedding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const isInitialLoad = reloadKey === 0;
      if (isInitialLoad) setIsLoading(true);
      setLoadError(null);

      try {
        const [weddingResponse, guestsResponse] = await Promise.all([
          fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
          fetch(`/api/weddings/${weddingId}/guests`, { cache: "no-store" }),
        ]);

        if (!weddingResponse.ok || !guestsResponse.ok) {
          throw new Error("load_failed");
        }

        const weddingJson = (await weddingResponse.json()) as WeddingDetailsApiResponse;
        const guestsJson = (await guestsResponse.json()) as WeddingGuestsApiResponse;
        const mappedGuests = mapGuestsFromApi(guestsJson.guests);

        const weddingDateLabel = weddingJson.wedding.date
          ? formatDate(new Date(weddingJson.wedding.date), locale as Locale)
          : baseData.weddingDateLabel;

        const firstEventId = weddingJson.wedding.events[0]?.id;
        const stats = deriveGuestStats(mappedGuests);
        if (active) {
          setCanEditWedding(weddingJson.access?.canEdit ?? false);
          const linkedHostIds = new Set(
            guestsJson.guests
              .map((guest) => guest.plusOneHostGuestId)
              .filter((value): value is string => typeof value === "string"),
          );

          setData({
            ...baseData,
            weddingName: weddingJson.wedding.name,
            weddingDateLabel,
            guests: mappedGuests,
            stats,
            seatingPlanHref: firstEventId ? routes.seating : baseData.seatingPlanHref,
          });
          setAvailableEvents(
            weddingJson.wedding.events.map((event) => ({
              id: event.id,
              name: event.name,
              type: event.type,
            })),
          );
          setLinkableGuests(
            guestsJson.guests
              .filter((guest) => {
                const hasRelationshipMembership = guest.relationshipMembers.length > 0;
                const isAdult = guest.ageCategory === "adult";
                return (
                  isAdult &&
                  guest.guardianGuestId === null &&
                  guest.plusOneHostGuestId === null &&
                  !linkedHostIds.has(guest.id) &&
                  !hasRelationshipMembership
                );
              })
              .map((guest) => ({
                id: guest.id,
                name: guest.name,
              })),
          );
        }
      } catch {
        if (active) setLoadError(t("weddingGuestsPage.loadError"));
        if (active && isInitialLoad) {
          setAvailableEvents([]);
          setLinkableGuests([]);
          setData((prev) => ({
            ...prev,
            guests: [],
            stats: {
              totalGuests: 0,
              confirmed: 0,
              pending: 0,
              notAttending: 0,
              noResponse: 0,
              deltaSinceUpdate: 0,
            },
          }));
        }
      } finally {
        if (active && isInitialLoad) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [weddingId, locale, baseData, reloadKey, routes.seating, t]);

  const handleQuickAction = (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => {
    if (!canEditWedding && action !== "plan" && action !== "learn") {
      return;
    }

    if (action === "add") {
      setIsAddGuestDialogOpen(true);
      return;
    }

    if (action === "plan" && data.seatingPlanHref) {
      router.push(data.seatingPlanHref);
    }
  };

  return (
    <AppWorkspacePage>
      <GuestsPageHeader
        notificationCount={data.notificationCount}
        onAction={handleQuickAction}
        isLoading={isLoading}
      />
      {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}
      <div className="mt-5 flex flex-col gap-5">
        {isLoading ? <WorkspaceStatsSkeleton count={4} /> : <GuestStatsCards stats={data.stats} isLoading={false} />}
        <GuestManagementTable
          weddingId={weddingId}
          guests={data.guests}
          isLoading={isLoading}
          canEdit={canEditWedding}
          onSaved={() => setReloadKey((prev) => prev + 1)}
        />
        {!isLoading ? <GuestTipCard onAction={handleQuickAction} /> : null}
      </div>

      {isAddGuestDialogOpen && canEditWedding ? (
        <AddGuestDialog
          weddingId={weddingId}
          open={isAddGuestDialogOpen}
          onOpenChange={setIsAddGuestDialogOpen}
          existingGuests={linkableGuests}
          availableEvents={availableEvents}
          onCreated={() => setReloadKey((prev) => prev + 1)}
        />
      ) : null}
    </AppWorkspacePage>
  );
}

function mapGuestsFromApi(apiGuests: WeddingGuestsApiGuest[]): WeddingGuest[] {
  const plusOneHostIds = new Set(
    apiGuests
      .map((guest) => guest.plusOneHostGuestId)
      .filter((value): value is string => typeof value === "string"),
  );

  return apiGuests.map((guest) => {
    const events = guest.eventGuests
      .map((eventGuest) => eventGuest.event.type)
      .filter(isSupportedGuestEvent);

    const uniqueEvents = Array.from(new Set(events));
    const eventGuestNotes = guest.eventGuests.filter((eventGuest) => eventGuest.notes).length;
    const requiresSeat = guest.eventGuests.some((eventGuest) => eventGuest.requiresSeat);
    const isChild = guest.ageCategory !== "adult";

    return {
      id: guest.id,
      name: guest.name,
      initials: getInitials(guest.name),
      status: mapGuestStatus(guest.eventGuests.map((eventGuest) => eventGuest.rsvpStatus)),
      sex: guest.sex,
      notes: guest.notes ?? null,
      eventGuestStatuses: guest.eventGuests.map((eventGuest) => ({
        eventId: eventGuest.eventId,
        rsvpStatus: eventGuest.rsvpStatus,
      })),
      ageCategory: guest.ageCategory,
      requiresSeat,
      isChild,
      guardianGuestId: guest.guardianGuestId,
      plusOneHostGuestId: guest.plusOneHostGuestId,
      events: uniqueEvents,
      plusOne: plusOneHostIds.has(guest.id),
      notesCount: (guest.notes ? 1 : 0) + eventGuestNotes,
      children: [],
      householdLabel: undefined,
    };
  });
}

function mapGuestStatus(rsvpStatuses: Array<"unknown" | "confirmed" | "declined" | "maybe">): GuestRsvpStatus {
  if (rsvpStatuses.length === 0) return "no_response";
  if (rsvpStatuses.some((status) => status === "confirmed")) return "confirmed";
  if (rsvpStatuses.every((status) => status === "declined")) return "not_attending";
  return "pending";
}

function isSupportedGuestEvent(value: string): value is WeddingGuestEvent {
  return value === "wedding" || value === "afterparty" || value === "bachelorette" || value === "bachelor";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

