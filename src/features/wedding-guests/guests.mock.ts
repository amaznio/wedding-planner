import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { GuestRsvpStatus, WeddingGuest, WeddingGuestsData, WeddingGuestStats } from "./types";

export const mockWeddingGuests: WeddingGuest[] = [
  {
    id: "guest_1",
    name: "Maciej Czerwonka",
    initials: "MC",
    status: "confirmed",
    events: ["wedding", "afterparty", "bachelor"],
    tableNumber: 3,
  },
  {
    id: "guest_2",
    name: "Magdalena Antas",
    initials: "MA",
    status: "confirmed",
    events: ["wedding", "afterparty", "bachelorette"],
    tableNumber: 3,
    plusOne: true,
  },
  {
    id: "guest_3",
    name: "Julian Czerwonka",
    initials: "JC",
    status: "pending",
    events: ["wedding", "afterparty"],
    tableNumber: 5,
  },
  {
    id: "guest_4",
    name: "Tomek Czarny",
    initials: "TC",
    status: "confirmed",
    events: ["wedding", "afterparty"],
    tableNumber: 5,
    notesCount: 1,
  },
  {
    id: "guest_5",
    name: "Adrian Kulpa",
    initials: "AK",
    status: "confirmed",
    events: ["wedding", "afterparty", "bachelor"],
    tableNumber: 8,
  },
  {
    id: "guest_6",
    name: "Patryk Mscisz",
    initials: "PM",
    status: "pending",
    events: ["wedding", "afterparty"],
    plusOne: true,
  },
  {
    id: "guest_7",
    name: "Zofia Czerwonka",
    initials: "ZC",
    status: "not_attending",
    events: ["wedding"],
    notesCount: 1,
  },
  {
    id: "guest_8",
    name: "Henryk Czerwonka",
    initials: "HC",
    status: "not_attending",
    events: ["wedding"],
  },
];

export const mockWeddingGuestStats: WeddingGuestStats = {
  totalGuests: 120,
  confirmed: 81,
  pending: 22,
  notAttending: 17,
  noResponse: 0,
  deltaSinceUpdate: 8,
};

export function buildWeddingGuestsMockData(weddingId: string): WeddingGuestsData {
  const dashboardData = buildDashboardMockData({
    weddingId,
    weddingName: "Klaudia & Adrian",
  });

  return {
    weddingId,
    weddingName: dashboardData.weddingName,
    weddingDateLabel: "20 czerwca 2026",
    currentUser: dashboardData.currentUser,
    navigation: dashboardData.navigation,
    notificationCount: 3,
    guests: mockWeddingGuests,
    stats: mockWeddingGuestStats,
    seatingPlanHref: dashboardData.events[0]?.href,
  };
}

export function deriveGuestStats(guests: WeddingGuest[]): WeddingGuestStats {
  const byStatus = guests.reduce<Record<GuestRsvpStatus, number>>(
    (acc, guest) => {
      // In wedding-level counts, +1 companions increase attendance totals as additional people.
      const guestUnits = guest.plusOne ? 2 : 1;
      acc[guest.status] += guestUnits;
      return acc;
    },
    {
      confirmed: 0,
      pending: 0,
      not_attending: 0,
      no_response: 0,
    },
  );

  return {
    totalGuests:
      byStatus.confirmed +
      byStatus.pending +
      byStatus.not_attending +
      byStatus.no_response,
    confirmed: byStatus.confirmed,
    pending: byStatus.pending,
    notAttending: byStatus.not_attending,
    noResponse: byStatus.no_response,
    deltaSinceUpdate: 0,
  };
}
