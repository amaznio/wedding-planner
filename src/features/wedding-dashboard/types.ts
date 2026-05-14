export type DashboardNavItemId =
  | "home"
  | "schedule"
  | "tasks"
  | "guests"
  | "events"
  | "budget"
  | "vendors"
  | "notes"
  | "documents"
  | "inspiration";

export type DashboardQuickActionId = "task" | "expense" | "vendor" | "event" | "note";

export type DashboardNavItem = {
  id: DashboardNavItemId;
  href?: string;
  disabled?: boolean;
  counter?: number;
};

export type DashboardEventStatus = "active" | "planned";

export type DashboardEventCard = {
  id: string;
  name: string;
  date: Date;
  href?: string;
  status: DashboardEventStatus;
  type: "wedding" | "afterparty" | "bachelorette" | "bachelor" | "other";
};

export type PlanningProgressRow = {
  id:
    | "guestList"
    | "eventGuests"
    | "budgetExpenses"
    | "vendors"
    | "schedule"
    | "notesIdeas"
    | "documents";
  href?: string;
  progress: number | null;
  detailLabel: string;
};

export type UpcomingTaskItem = {
  id: string;
  title: string;
  dueInDays: number;
};

export type RecentExpenseItem = {
  id: string;
  title: string;
  amountMinor: number;
  incurredAt: Date;
};

export type WeddingOverviewData = {
  coupleNames: string;
  weddingDate: Date;
  venue: string;
  guestEstimate: number;
  budgetMinor: number;
  spentMinor: number;
  currency: string;
};

export type WeddingDashboardData = {
  weddingId: string;
  weddingName: string;
  weddingDate: Date;
  currentUser: {
    name: string;
    email: string;
    image?: string | null;
  };
  navigation: DashboardNavItem[];
  overview: WeddingOverviewData;
  events: DashboardEventCard[];
  planningProgress: PlanningProgressRow[];
  upcomingTasks: UpcomingTaskItem[];
  recentExpenses: RecentExpenseItem[];
  quickActions: DashboardQuickActionId[];
  notesCount: number;
  documentsCount: number;
  activeTasksCount: number;
};
