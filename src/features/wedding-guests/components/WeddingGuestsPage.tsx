"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatDate } from "@/features/wedding-dashboard/lib/formatting";
import { WeddingDashboardShell } from "@/features/wedding-dashboard/components/WeddingDashboardShell";
import { WeddingDashboardSidebar } from "@/features/wedding-dashboard/components/WeddingDashboardSidebar";
import { buildWeddingGuestsMockData, deriveGuestStats } from "../guests.mock";
import type { GuestRsvpStatus, WeddingGuest, WeddingGuestsData, WeddingGuestEvent } from "../types";
import { GuestInsightsPanel } from "./GuestInsightsPanel";
import { GuestManagementTable } from "./GuestManagementTable";
import { GuestsPageHeader } from "./GuestsPageHeader";
import { GuestStatsCards } from "./GuestStatsCards";

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
    }>;
  };
};

type WeddingGuestsApiGuest = {
  id: string;
  name: string;
  notes: string | null;
  plusOneHostGuestId: string | null;
  eventGuests: Array<{
    rsvpStatus: "unknown" | "confirmed" | "declined" | "maybe";
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

export function WeddingGuestsPage({ weddingId }: WeddingGuestsPageProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const baseData = useMemo(() => buildWeddingGuestsMockData(weddingId), [weddingId]);

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);

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
          setData({
            ...baseData,
            weddingName: weddingJson.wedding.name,
            weddingDateLabel,
            guests: mappedGuests,
            stats,
            seatingPlanHref: firstEventId ? `/weddings/${weddingId}/events/${firstEventId}` : baseData.seatingPlanHref,
          });
        }
      } catch {
        if (active) {
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
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [weddingId, locale, baseData]);

  const rsvpShare = useMemo(() => {
    const total = data.stats.totalGuests || 1;
    return {
      confirmed: Math.round((data.stats.confirmed / total) * 100),
      pending: Math.round((data.stats.pending / total) * 100),
      notAttending: Math.round((data.stats.notAttending / total) * 100),
      noResponse: Math.round((data.stats.noResponse / total) * 100),
    };
  }, [data.stats]);

  const handlePlaceholderAction = (id: string) => {
    void id;
  };

  const handleQuickAction = (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => {
    if (action === "plan" && data.seatingPlanHref) {
      router.push(data.seatingPlanHref);
    }
  };

  return (
    <WeddingDashboardShell
      sidebar={(
        <WeddingDashboardSidebar
          weddingName={data.weddingName}
          weddingDateLabel={data.weddingDateLabel}
          currentPath={pathname}
          navigation={data.navigation}
          currentUser={data.currentUser}
          onPlaceholderAction={handlePlaceholderAction}
        />
      )}
      mobileSidebar={(
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-[88vw] max-w-[320px] p-0">
            <SheetTitle className="sr-only">{t("dashboard.sidebar.mobileTitle")}</SheetTitle>
            <WeddingDashboardSidebar
              weddingName={data.weddingName}
              weddingDateLabel={data.weddingDateLabel}
              currentPath={pathname}
              navigation={data.navigation}
              currentUser={data.currentUser}
              onPlaceholderAction={() => {
                setIsMobileSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
      header={(
        <GuestsPageHeader
          notificationCount={data.notificationCount}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onAction={handleQuickAction}
        />
      )}
    >
      <div className="flex flex-col gap-5">
        <GuestStatsCards stats={data.stats} shares={rsvpShare} isLoading={isLoading} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <GuestManagementTable
            guests={data.guests}
            totalGuests={data.stats.totalGuests}
            isLoading={isLoading}
          />
          <GuestInsightsPanel
            stats={data.stats}
            shares={rsvpShare}
            isLoading={isLoading}
            onAction={handleQuickAction}
          />
        </div>
      </div>
    </WeddingDashboardShell>
  );
}

function mapGuestsFromApi(apiGuests: WeddingGuestsApiGuest[]): WeddingGuest[] {
  const plusOneHostIds = new Set(
    apiGuests
      .map((guest) => guest.plusOneHostGuestId)
      .filter((value): value is string => typeof value === "string"),
  );

  return apiGuests
    .filter((guest) => guest.plusOneHostGuestId === null)
    .map((guest) => {
      const events = guest.eventGuests
        .map((eventGuest) => eventGuest.event.type)
        .filter(isSupportedGuestEvent);

      const uniqueEvents = Array.from(new Set(events));
      const eventGuestNotes = guest.eventGuests.filter((eventGuest) => eventGuest.notes).length;

      return {
        id: guest.id,
        name: guest.name,
        initials: getInitials(guest.name),
        status: mapGuestStatus(guest.eventGuests.map((eventGuest) => eventGuest.rsvpStatus)),
        events: uniqueEvents,
        plusOne: plusOneHostIds.has(guest.id),
        notesCount: (guest.notes ? 1 : 0) + eventGuestNotes,
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
