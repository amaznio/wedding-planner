"use client";

import type { Locale } from "@/i18n/config";
import type {
  DashboardQuickActionId,
  RecentExpenseItem,
  UpcomingTaskItem,
} from "../types";
import { UpcomingTasksCard } from "./UpcomingTasksCard";
import { RecentExpensesCard } from "./RecentExpensesCard";
import { QuickActionsCard } from "./QuickActionsCard";

type DashboardWidgetsGridProps = {
  tasks: UpcomingTaskItem[];
  expenses: RecentExpenseItem[];
  actions: DashboardQuickActionId[];
  currency: string;
  totalSpentMinor: number;
  locale: Locale;
  onQuickAction: (id: DashboardQuickActionId) => void;
  onPlaceholderAction: (id: string) => void;
  onOpenTasks: () => void;
};

export function DashboardWidgetsGrid({
  tasks,
  expenses,
  actions,
  currency,
  totalSpentMinor,
  locale,
  onQuickAction,
  onPlaceholderAction,
  onOpenTasks,
}: DashboardWidgetsGridProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <UpcomingTasksCard tasks={tasks} onOpenAll={onOpenTasks} />
      <RecentExpensesCard
        expenses={expenses}
        currency={currency}
        totalSpentMinor={totalSpentMinor}
        locale={locale}
        onOpenAll={() => onPlaceholderAction("recentExpenses")}
      />
      <QuickActionsCard actions={actions} onAction={onQuickAction} />
    </section>
  );
}
