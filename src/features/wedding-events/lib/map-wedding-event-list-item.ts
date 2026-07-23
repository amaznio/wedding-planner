import type { Locale } from "@/i18n/config";

export type WeddingEventListItem = {
  id: string;
  name: string;
  type: "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";
  startsAt: string | null;
  location: string | null;
  address: string | null;
  guestCount: number;
  confirmedCount: number;
  respondedCount: number;
  confirmedPercent: number;
  respondedPercent: number;
  seatingPlanCount: number;
  requiresSeatingPlan: boolean;
  vendorCount: number;
  coverageStatus: "missingGuests" | "missingRsvps" | "missingSeating" | "missingVendors" | "ready";
  isMainEvent: boolean;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  displayDateTime: string;
};

export function mapWeddingEventListItem(input: {
  id: string;
  name: string;
  type: "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";
  startsAt: string | null;
  location: string | null;
  address: string | null;
  guestCount: number;
  confirmedCount: number;
  respondedCount: number;
  seatingPlanCount: number;
  requiresSeatingPlan: boolean;
  vendorCount: number;
  locale: Locale;
}): WeddingEventListItem {
  const startsAtDate = input.startsAt ? new Date(input.startsAt) : null;

  const dayLabel = startsAtDate
    ? String(startsAtDate.getDate()).padStart(2, "0")
    : "--";

  const monthLabel = startsAtDate
    ? new Intl.DateTimeFormat(input.locale, { month: "short" }).format(startsAtDate).replace(".", "").toUpperCase()
    : "---";

  const yearLabel = startsAtDate
    ? String(startsAtDate.getFullYear())
    : "----";

  const displayDateTime = startsAtDate
    ? new Intl.DateTimeFormat(input.locale, { dateStyle: "full", timeStyle: "short" }).format(startsAtDate)
    : "-";

  const confirmedPercent = input.guestCount > 0
    ? Math.round((input.confirmedCount / input.guestCount) * 100)
    : 0;

  const respondedPercent = input.guestCount > 0
    ? Math.round((input.respondedCount / input.guestCount) * 100)
    : 0;

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    startsAt: input.startsAt,
    location: input.location,
    address: input.address,
    guestCount: input.guestCount,
    confirmedCount: input.confirmedCount,
    respondedCount: input.respondedCount,
    confirmedPercent,
    respondedPercent,
    seatingPlanCount: input.seatingPlanCount,
    requiresSeatingPlan: input.requiresSeatingPlan,
    vendorCount: input.vendorCount,
    coverageStatus: getCoverageStatus({
      guestCount: input.guestCount,
      respondedCount: input.respondedCount,
      seatingPlanCount: input.seatingPlanCount,
      requiresSeatingPlan: input.requiresSeatingPlan,
      vendorCount: input.vendorCount,
    }),
    isMainEvent: input.type === "wedding",
    dayLabel,
    monthLabel,
    yearLabel,
    displayDateTime,
  };
}

function getCoverageStatus(input: {
  guestCount: number;
  respondedCount: number;
  seatingPlanCount: number;
  requiresSeatingPlan: boolean;
  vendorCount: number;
}): WeddingEventListItem["coverageStatus"] {
  if (input.guestCount === 0) return "missingGuests";
  if (input.respondedCount < input.guestCount) return "missingRsvps";
  if (input.requiresSeatingPlan && input.seatingPlanCount === 0) return "missingSeating";
  if (input.vendorCount === 0) return "missingVendors";
  return "ready";
}
