import type { DashboardNavItem } from "@/features/wedding-dashboard/types";

export type WeddingEventDetailType = "wedding" | "afterparty" | "bachelorette" | "bachelor" | "custom";

export type WeddingEventTimelineStatus = "done" | "upcoming" | "draft";

export type WeddingVendorStatus = "confirmed" | "pending";

export type EventTabId =
  | "overview"
  | "timeline"
  | "guests"
  | "seating"
  | "vendors"
  | "budget"
  | "tasks"
  | "notes"
  | "settings";

export type WeddingEventDetail = {
  id: string;
  weddingId: string;
  name: string;
  type: WeddingEventDetailType;
  isMainEvent: boolean;
  date: string;
  startTime: string;
  endTime: string;
  venue: {
    name: string;
    address: string;
  };
  theme: string;
  guests: {
    total: number;
    confirmed: number;
    pending: number;
    notAttending: number;
  };
  seating: {
    seated: number;
    total: number;
    unseated: number;
    tables: number;
    warnings: number;
  };
  budget: {
    total: number;
    spent: number;
  };
  timeline: Array<{
    id: string;
    time: string;
    titleKey: string;
    descriptionKey: string;
    status: WeddingEventTimelineStatus;
  }>;
  vendors: Array<{
    id: string;
    categoryKey: string;
    name: string;
    status: WeddingVendorStatus;
  }>;
  tasks: Array<{
    id: string;
    titleKey: string;
    dueInDays: number;
    completed: boolean;
  }>;
  notes: string[];
};

export type EventSeatingPlanSummary = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export type EventCommandCenterData = {
  weddingId: string;
  weddingName: string;
  weddingDateLabel: string;
  currentUser: {
    name: string;
    email: string;
  };
  notificationCount: number;
  navigation: DashboardNavItem[];
  event: WeddingEventDetail;
  seatingPlans: EventSeatingPlanSummary[];
};
