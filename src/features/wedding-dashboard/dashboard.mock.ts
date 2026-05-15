import type {
  DashboardEventCard,
  WeddingDashboardData,
  DashboardQuickActionId,
  PlanningProgressRow,
} from "./types";

type BuildDashboardDataInput = {
  weddingId: string;
  weddingName: string;
  weddingDate?: Date | null;
  venue?: string;
  coverImageUrl?: string | null;
  currency?: string;
  guestCount?: number;
  budgetMinor?: number;
  spentMinor?: number;
  events?: DashboardEventCard[];
};

const DEFAULT_WEDDING_DATE = new Date("2026-06-20T12:00:00.000Z");

export function buildDashboardMockData(input: BuildDashboardDataInput): WeddingDashboardData {
  const weddingDate = input.weddingDate ?? DEFAULT_WEDDING_DATE;
  const budgetMinor = input.budgetMinor ?? 120_000_00;
  const spentMinor = input.spentMinor ?? 65_000_00;
  const guestCount = input.guestCount ?? 120;
  const events = input.events && input.events.length > 0 ? input.events : getDefaultEvents(input.weddingId);

  const planningProgress: PlanningProgressRow[] = [
    {
      id: "guestList",
      progress: 67,
      detailLabel: `81 / ${guestCount}`,
      href: `/weddings/${input.weddingId}/guests`,
    },
    {
      id: "eventGuests",
      progress: 42,
      detailLabel: "2 / 4",
      href: events[0]?.href,
    },
    {
      id: "budgetExpenses",
      progress: 54,
      detailLabel: `${spentMinor / 100} / ${budgetMinor / 100}`,
      href: `/weddings/${input.weddingId}/expenses`,
    },
    {
      id: "vendors",
      progress: 60,
      detailLabel: "6 / 10",
      href: `/weddings/${input.weddingId}/vendors`,
    },
    {
      id: "schedule",
      progress: 30,
      detailLabel: "3 / 10",
    },
    {
      id: "notesIdeas",
      progress: null,
      detailLabel: "12",
    },
    {
      id: "documents",
      progress: null,
      detailLabel: "8",
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
      { id: "home", href: `/weddings/${input.weddingId}` },
      { id: "schedule", disabled: true },
      { id: "tasks", disabled: true, counter: 12 },
      { id: "guests", href: `/weddings/${input.weddingId}/guests` },
      { id: "collaborators", href: `/weddings/${input.weddingId}/collaborators` },
      { id: "events", href: events[0]?.href },
      { id: "budget", href: `/weddings/${input.weddingId}/expenses` },
      { id: "vendors", href: `/weddings/${input.weddingId}/vendors` },
      { id: "notes", disabled: true },
      { id: "documents", disabled: true },
      { id: "inspiration", disabled: true },
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
    upcomingTasks: [
      { id: "task_1", title: "confirmMenu", dueInDays: 5 },
      { id: "task_2", title: "chooseDecor", dueInDays: 8 },
      { id: "task_3", title: "meetPhotographer", dueInDays: 12 },
      { id: "task_4", title: "dressFitting", dueInDays: 20 },
    ],
    recentExpenses: [
      { id: "exp_1", title: "catering", amountMinor: 12_000_00, incurredAt: new Date("2026-05-12") },
      { id: "exp_2", title: "photographer", amountMinor: 6_500_00, incurredAt: new Date("2026-05-10") },
      { id: "exp_3", title: "decorations", amountMinor: 3_200_00, incurredAt: new Date("2026-05-08") },
      { id: "exp_4", title: "band", amountMinor: 9_000_00, incurredAt: new Date("2026-05-05") },
    ],
    quickActions,
    notesCount: 12,
    documentsCount: 8,
    activeTasksCount: 12,
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
