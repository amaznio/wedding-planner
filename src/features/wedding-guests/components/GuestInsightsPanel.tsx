import type { WeddingGuestStats } from "../types";
import { GuestQuickActionsCard } from "./GuestQuickActionsCard";
import { GuestSummaryCard } from "./GuestSummaryCard";
import { GuestTipCard } from "./GuestTipCard";

type GuestInsightsPanelProps = {
  stats: WeddingGuestStats;
  shares: {
    confirmed: number;
    pending: number;
    notAttending: number;
    noResponse: number;
  };
  isLoading: boolean;
  onAction: (action: "import" | "add" | "send" | "reminder" | "export" | "plan" | "learn") => void;
};

export function GuestInsightsPanel({ stats, shares, isLoading, onAction }: GuestInsightsPanelProps) {
  return (
    <aside className="flex flex-col gap-4">
      <GuestSummaryCard stats={stats} shares={shares} isLoading={isLoading} />
      <GuestQuickActionsCard onAction={onAction} />
      <GuestTipCard onAction={onAction} />
    </aside>
  );
}
