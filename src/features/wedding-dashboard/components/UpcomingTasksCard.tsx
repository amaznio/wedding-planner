"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";
import type { UpcomingTaskItem } from "../types";

type UpcomingTasksCardProps = {
  tasks: UpcomingTaskItem[];
  onOpenAll: () => void;
};

export function UpcomingTasksCard({ tasks, onOpenAll }: UpcomingTasksCardProps) {
  const { t } = useI18n();

  return (
    <Card className="border-zinc-200/80 bg-white">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-lg">{t("dashboard.widgets.upcomingTasks.title")}</CardTitle>
        <Button type="button" variant="ghost" className="h-auto px-0 text-xs" onClick={onOpenAll}>
          {t("dashboard.widgets.viewAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length ? tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/40 p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold text-zinc-700">
              {task.dueInDays < 0 ? Math.abs(task.dueInDays) : task.dueInDays}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">
                {task.title}
              </p>
              <p className="text-xs text-zinc-600">
                {task.dueInDays < 0
                  ? t("dashboard.widgets.upcomingTasks.overdue", { count: Math.abs(task.dueInDays) })
                  : task.dueInDays === 0
                    ? t("dashboard.widgets.upcomingTasks.dueToday")
                    : t("dashboard.widgets.upcomingTasks.dueIn", { count: task.dueInDays })}
              </p>
            </div>
            <Badge className={task.dueInDays < 0 ? "border-red-200 bg-red-50 text-red-700" : undefined}>
              {task.dueInDays < 0 ? t("dashboard.widgets.upcomingTasks.overdueBadge") : t("dashboard.widgets.upcomingTasks.badge")}
            </Badge>
          </div>
        )) : <p className="py-3 text-sm text-zinc-500">{t("dashboard.widgets.upcomingTasks.empty")}</p>}
      </CardContent>
    </Card>
  );
}
