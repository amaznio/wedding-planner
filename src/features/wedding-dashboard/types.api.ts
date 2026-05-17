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
      type: "wedding" | "afterparty" | "bachelor" | "bachelorette" | "other";
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
  expenseSummary: Array<{
    status: string;
    _sum: { amountMinor: number | null };
    _count: { _all: number };
  }>;
  vendorSummary: {
    totalCostMinor: number;
    totalDepositMinor: number;
    totalPaidMinor: number;
    remainingMinor: number;
  };
};
