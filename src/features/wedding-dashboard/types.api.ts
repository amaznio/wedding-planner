export type WeddingDetailApiResponse = {
  access: {
    role: "owner" | "editor" | "viewer";
    canEdit: boolean;
    canManageMembers: boolean;
    canDeleteWedding: boolean;
  };
  wedding: {
    id: string;
    name: string;
    date: string | null;
    timezone: string | null;
    location: string | null;
    currency: string;
    notes: string | null;
    coverImageUrl: string | null;
    coverImagePublicId: string | null;
    coverImageWidth: number | null;
    coverImageHeight: number | null;
    coverImageUploadedAt: string | null;
    events: Array<{
      id: string;
      name: string;
      type: "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";
      startsAt: string | null;
    }>;
    _count: {
      guests: number;
      vendors: number;
      expenses: number;
      households: number;
      guestGroups: number;
    };
  };
};

export type WeddingDashboardApiResponse = {
  currency: string;
  rsvpByEvent: Array<{
    eventId: string;
    name: string;
    type: "wedding" | "ceremony" | "afterparty" | "bachelor" | "bachelorette" | "other";
    totalEventGuests: number;
    invited: number;
    confirmed: number;
    declined: number;
    maybe: number;
    seatedEligible: number;
  }>;
  expenseSummary: Array<{
    status: string;
    _sum: { amountMinor: number | null };
    _count: { _all: number };
  }>;
  recentPayments: Array<{
    id: string;
    title: string;
    amountMinor: number;
    incurredAt: string;
    vendor: { id: string; name: string } | null;
  }>;
  activeTaskCount: number;
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
  }>;
  vendorSummary: {
    activeCount: number;
    securedCount: number;
    totalCostMinor: number;
    totalDepositMinor: number;
    totalPaidMinor: number;
    remainingMinor: number;
  };
};
