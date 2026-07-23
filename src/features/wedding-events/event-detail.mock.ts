import { buildDashboardMockData } from "@/features/wedding-dashboard/dashboard.mock";
import type { EventSeatingPlanSummary, WeddingEventDetail } from "./types";

type BuildEventDetailMockDataInput = {
  weddingId: string;
  eventId: string;
  weddingName?: string;
  eventName?: string;
  isMainEvent?: boolean;
};

export function buildEventDetailMockData(input: BuildEventDetailMockDataInput): {
  weddingName: string;
  weddingDateLabel: string;
  currentUser: {
    name: string;
    email: string;
  };
  navigation: ReturnType<typeof buildDashboardMockData>["navigation"];
  notificationCount: number;
  event: WeddingEventDetail;
  seatingPlans: EventSeatingPlanSummary[];
} {
  const dashboardData = buildDashboardMockData({
    weddingId: input.weddingId,
    weddingName: input.weddingName ?? "Klaudia & Adrian",
  });

  return {
    weddingName: input.weddingName ?? "Klaudia & Adrian",
    weddingDateLabel: "20 czerwca 2026",
    currentUser: dashboardData.currentUser,
    navigation: dashboardData.navigation,
    notificationCount: 3,
    event: {
      id: input.eventId,
      weddingId: input.weddingId,
      name: input.eventName ?? "Wedding",
      type: "wedding",
      isMainEvent: input.isMainEvent ?? true,
      date: "2026-06-20",
      startTime: "16:00",
      venue: {
        name: "Folwark Wąsowo",
        address: "Wąsowo 39, 64-320 Buk",
      },
      theme: "Classic elegance",
      guests: {
        total: 120,
        confirmed: 81,
        pending: 22,
        notAttending: 17,
      },
      seating: {
        seated: 81,
        total: 120,
        unseated: 12,
        tables: 5,
        warnings: 3,
      },
      budget: {
        total: 70_000,
        spent: 45_500,
      },
      timeline: [
        {
          id: "welcome",
          time: "16:00",
          titleKey: "events.detail.timelineItems.welcome.title",
          descriptionKey: "events.detail.timelineItems.welcome.description",
          status: "done",
        },
        {
          id: "ceremony",
          time: "17:00",
          titleKey: "events.detail.timelineItems.ceremony.title",
          descriptionKey: "events.detail.timelineItems.ceremony.description",
          status: "done",
        },
        {
          id: "cocktail",
          time: "17:30",
          titleKey: "events.detail.timelineItems.cocktail.title",
          descriptionKey: "events.detail.timelineItems.cocktail.description",
          status: "done",
        },
        {
          id: "dinner",
          time: "19:00",
          titleKey: "events.detail.timelineItems.dinner.title",
          descriptionKey: "events.detail.timelineItems.dinner.description",
          status: "upcoming",
        },
        {
          id: "firstDance",
          time: "20:30",
          titleKey: "events.detail.timelineItems.firstDance.title",
          descriptionKey: "events.detail.timelineItems.firstDance.description",
          status: "upcoming",
        },
        {
          id: "cake",
          time: "00:00",
          titleKey: "events.detail.timelineItems.cake.title",
          descriptionKey: "events.detail.timelineItems.cake.description",
          status: "draft",
        },
        {
          id: "end",
          time: "02:00",
          titleKey: "events.detail.timelineItems.end.title",
          descriptionKey: "events.detail.timelineItems.end.description",
          status: "draft",
        },
      ],
      vendors: [
        {
          id: "vendor_venue",
          categoryKey: "events.detail.vendors.category.venue",
          name: "Folwark Wąsowo",
          status: "confirmed",
        },
        {
          id: "vendor_catering",
          categoryKey: "events.detail.vendors.category.catering",
          name: "Smaki Premium",
          status: "confirmed",
        },
        {
          id: "vendor_photo",
          categoryKey: "events.detail.vendors.category.photographer",
          name: "Anna Kowalska",
          status: "confirmed",
        },
        {
          id: "vendor_band",
          categoryKey: "events.detail.vendors.category.band",
          name: "The Wedding Band",
          status: "pending",
        },
      ],
      tasks: [
        {
          id: "task_menu",
          titleKey: "events.detail.tasks.confirmMenu",
          dueInDays: 5,
          completed: false,
        },
        {
          id: "task_seating",
          titleKey: "events.detail.tasks.finishSeating",
          dueInDays: 8,
          completed: false,
        },
        {
          id: "task_photo",
          titleKey: "events.detail.tasks.confirmPhotoList",
          dueInDays: 12,
          completed: false,
        },
      ],
      notes: [
        "events.detail.notes.items.0",
        "events.detail.notes.items.1",
      ],
    },
    seatingPlans: [],
  };
}
