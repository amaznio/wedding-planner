import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { DashboardEventCard } from "@/features/wedding-dashboard/types";
import type { WeddingDashboardApiResponse, WeddingDetailApiResponse } from "@/features/wedding-dashboard/types.api";

export type WeddingDashboardViewModel = {
  canEditWedding: boolean;
  weddingForm: {
    name: string;
    date: string;
    timezone: string;
    location: string;
    currency: string;
    notes: string;
  };
  dashboardData: ReturnType<typeof buildDashboardMockData>;
};

export async function fetchWeddingDashboardViewModel(weddingId: string): Promise<WeddingDashboardViewModel> {
  const [weddingResponse, dashboardResponse] = await Promise.all([
    fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    fetch(`/api/weddings/${weddingId}/dashboard`, { cache: "no-store" }),
  ]);

  if (!weddingResponse.ok) throw new Error("weddingLoadFailed");
  if (!dashboardResponse.ok) throw new Error("dashboardLoadFailed");

  const weddingJson = (await weddingResponse.json()) as WeddingDetailApiResponse;
  const dashboardJson = (await dashboardResponse.json()) as WeddingDashboardApiResponse;

  const mappedEvents = mapEvents(weddingId, weddingJson.wedding.events);
  const primaryEventId = weddingJson.wedding.events.find((event) => event.type === "wedding")?.id
    ?? weddingJson.wedding.events[0]?.id;
  const primaryRsvp = dashboardJson.rsvpByEvent.find((event) => event.eventId === primaryEventId)
    ?? dashboardJson.rsvpByEvent[0];
  const rsvpRespondedCount = primaryRsvp
    ? primaryRsvp.confirmed + primaryRsvp.declined + primaryRsvp.maybe
    : 0;
  const rsvpTotalCount = primaryRsvp?.totalEventGuests ?? weddingJson.wedding._count.guests;
  const expenseSpentMinor = dashboardJson.expenseSummary
    .filter((row) => row.status !== "canceled")
    .reduce((sum, row) => sum + (row._sum.amountMinor ?? 0), 0);

  const dashboardData = buildDashboardMockData({
    weddingId,
    weddingName: weddingJson.wedding.name,
    weddingDate: weddingJson.wedding.date ? new Date(weddingJson.wedding.date) : null,
    venue: weddingJson.wedding.location ?? undefined,
    coverImageUrl: weddingJson.wedding.coverImageUrl,
    currency: dashboardJson.currency,
    guestCount: weddingJson.wedding._count.guests,
    rsvpRespondedCount,
    rsvpTotalCount,
    budgetMinor: dashboardJson.vendorSummary.totalCostMinor || undefined,
    spentMinor: dashboardJson.vendorSummary.totalPaidMinor || expenseSpentMinor || undefined,
    events: mappedEvents,
  });

  return {
    canEditWedding: weddingJson.access?.canEdit ?? false,
    weddingForm: {
      name: weddingJson.wedding.name ?? "",
      date: weddingJson.wedding.date ? weddingJson.wedding.date.slice(0, 10) : "",
      timezone: weddingJson.wedding.timezone ?? "",
      location: weddingJson.wedding.location ?? "",
      currency: weddingJson.wedding.currency ?? "PLN",
      notes: weddingJson.wedding.notes ?? "",
    },
    dashboardData,
  };
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
