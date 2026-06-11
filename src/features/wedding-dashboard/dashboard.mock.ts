import type {
  DashboardEventCard,
  WeddingDashboardData,
  DashboardQuickActionId,
  PlanningProgressRow,
} from "./types";
import { getWeddingRoutes } from "@/lib/routes";

type BuildDashboardDataInput = {
  weddingId: string;
  weddingName: string;
  weddingDate?: Date | null;
  venue?: string;
  coverImageUrl?: string | null;
  currency?: string;
  guestCount?: number;
  rsvpRespondedCount?: number;
  rsvpTotalCount?: number;
  budgetMinor?: number;
  spentMinor?: number;
  events?: DashboardEventCard[];
  activeTaskCount?: number;
  upcomingTasks?: WeddingDashboardData["upcomingTasks"];
};

const DEFAULT_WEDDING_DATE = new Date("2026-06-20T12:00:00.000Z");

export function buildDashboardMockData(input: BuildDashboardDataInput): WeddingDashboardData {
  const routes = getWeddingRoutes(input.weddingId);
  const weddingDate = input.weddingDate ?? DEFAULT_WEDDING_DATE;
  const budgetMinor = input.budgetMinor ?? 120_000_00;
  const spentMinor = input.spentMinor ?? 65_000_00;
  const guestCount = input.guestCount ?? 120;
  const rsvpTotalCount = input.rsvpTotalCount ?? guestCount;
  const rsvpRespondedCount = input.rsvpRespondedCount ?? 81;
  const rsvpProgress = rsvpTotalCount > 0 ? Math.round((rsvpRespondedCount / rsvpTotalCount) * 100) : 0;
  const events = input.events && input.events.length > 0 ? input.events : getDefaultEvents(input.weddingId);
  const primaryEventHref = events.find((event) => event.type === "wedding")?.href ?? events[0]?.href;

  const planningProgress: PlanningProgressRow[] = [
    {
      id: "guestList",
      progress: rsvpProgress,
      detailLabel: `${rsvpRespondedCount} / ${rsvpTotalCount}`,
      href: routes.guests,
    },
    {
      id: "eventGuests",
      progress: 42,
      detailLabel: "2 / 4",
      href: routes.events,
    },
    {
      id: "budgetExpenses",
      progress: 54,
      detailLabel: `${spentMinor / 100} / ${budgetMinor / 100}`,
      href: routes.budget,
    },
    {
      id: "vendors",
      progress: 60,
      detailLabel: "6 / 10",
      href: routes.vendors,
    },
    {
      id: "schedule",
      progress: 30,
      detailLabel: "3 / 10",
      href: primaryEventHref ? `${primaryEventHref}?tab=schedule` : undefined,
    },
    {
      id: "notesIdeas",
      progress: null,
      detailLabel: "12",
      href: routes.notes,
    },
    {
      id: "documents",
      progress: null,
      detailLabel: "8",
      href: routes.documents,
    },
  ];

  const quickActions: DashboardQuickActionId[] = ["task", "expense", "vendor", "note"];

  return {
    weddingId: input.weddingId,
    weddingName: input.weddingName,
    weddingDate,
    currentUser: {
      name: "Klaudia",
      email: "klaudia@example.com",
    },
    navigation: [
      { id: "home", href: routes.root },
      { id: "guests", href: routes.guests },
      { id: "events", href: routes.events },
      { id: "seating", href: routes.seating },
      { id: "budget", href: routes.budget },
      { id: "vendors", href: routes.vendors },
      { id: "tasks", href: routes.tasks, counter: input.activeTaskCount ?? 0 },
      { id: "notes", href: routes.notes },
      { id: "documents", href: routes.documents },
      { id: "collaborators", href: routes.collaborators },
      { id: "settings", href: routes.settings },
    ],
    overview: {
      coupleNames: input.weddingName,
      weddingDate,
      venue: input.venue?.trim() || "Folwark W\u0105sowo",
      coverImageUrl: input.coverImageUrl ?? null,
      guestEstimate: guestCount,
      budgetMinor,
      spentMinor,
      currency: input.currency?.toUpperCase() ?? "PLN",
    },
    events,
    planningProgress,
    upcomingTasks: input.upcomingTasks ?? [],
    recentExpenses: [
      { id: "exp_1", title: "catering", amountMinor: 12_000_00, incurredAt: new Date("2026-05-12") },
      { id: "exp_2", title: "photographer", amountMinor: 6_500_00, incurredAt: new Date("2026-05-10") },
      { id: "exp_3", title: "decorations", amountMinor: 3_200_00, incurredAt: new Date("2026-05-08") },
      { id: "exp_4", title: "band", amountMinor: 9_000_00, incurredAt: new Date("2026-05-05") },
    ],
    quickActions,
    notesCount: 12,
    documentsCount: 8,
    activeTasksCount: input.activeTaskCount ?? 0,
  };
}

function getDefaultEvents(weddingId: string): DashboardEventCard[] {
  return [
    {
      id: "evt_wedding",
      name: "Wedding",
      date: new Date("2026-06-20T12:00:00.000Z"),
      status: "active",
      type: "wedding",
      href: `/weddings/${weddingId}/events/evt_wedding`,
    },
    {
      id: "evt_afterparty",
      name: "Afterparty",
      date: new Date("2026-06-21T15:00:00.000Z"),
      status: "planned",
      type: "afterparty",
      href: `/weddings/${weddingId}/events/evt_afterparty`,
    },
    {
      id: "evt_bachelorette",
      name: "Bachelorette",
      date: new Date("2026-04-12T18:00:00.000Z"),
      status: "planned",
      type: "bachelorette",
      href: `/weddings/${weddingId}/events/evt_bachelorette`,
    },
    {
      id: "evt_bachelor",
      name: "Bachelor Party",
      date: new Date("2026-04-11T18:00:00.000Z"),
      status: "planned",
      type: "bachelor",
      href: `/weddings/${weddingId}/events/evt_bachelor`,
    },
  ];
}

