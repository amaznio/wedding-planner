import type { Locale } from "@/i18n/config";

export type WeddingEventListItem = {
  id: string;
  name: string;
  type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
  startsAt: string | null;
  location: string | null;
  guestCount: number;
  confirmedCount: number;
  confirmedPercent: number;
  isMainEvent: boolean;
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  displayDateTime: string;
};

export function mapWeddingEventListItem(input: {
  id: string;
  name: string;
  type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
  startsAt: string | null;
  location: string | null;
  guestCount: number;
  confirmedCount: number;
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

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    startsAt: input.startsAt,
    location: input.location,
    guestCount: input.guestCount,
    confirmedCount: input.confirmedCount,
    confirmedPercent,
    isMainEvent: input.type === "wedding",
    dayLabel,
    monthLabel,
    yearLabel,
    displayDateTime,
  };
}
