import type { DashboardNavItem } from "@/features/wedding-dashboard/types";

export type GuestRsvpStatus = "confirmed" | "pending" | "not_attending" | "no_response";

export type WeddingGuestEvent = "wedding" | "afterparty" | "bachelorette" | "bachelor";

export type WeddingGuest = {
  id: string;
  name: string;
  initials: string;
  status: GuestRsvpStatus;
  events: WeddingGuestEvent[];
  tableNumber?: number;
  plusOne?: boolean;
  notesCount?: number;
};

export type WeddingGuestStats = {
  totalGuests: number;
  confirmed: number;
  pending: number;
  notAttending: number;
  noResponse: number;
  deltaSinceUpdate: number;
};

export type WeddingGuestsData = {
  weddingId: string;
  weddingName: string;
  weddingDateLabel: string;
  currentUser: {
    name: string;
    email: string;
  };
  navigation: DashboardNavItem[];
  notificationCount: number;
  guests: WeddingGuest[];
  stats: WeddingGuestStats;
  seatingPlanHref?: string;
};

