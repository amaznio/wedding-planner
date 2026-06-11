"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { toIntlLocale } from "../lib/formatting";
import type { UpcomingTaskItem } from "../types";

type UpcomingTasksCardProps = {
  tasks: UpcomingTaskItem[];
  locale: Locale;
  canEdit: boolean;
  completingTaskIds: Set<string>;
  onCompleteTask: (taskId: string) => void;
  onOpenAll: () => void;
};

export function UpcomingTasksCard({
  tasks,
  locale,
  canEdit,
  completingTaskIds,
  onCompleteTask,
  onOpenAll,
}: UpcomingTasksCardProps) {
  const { t } = useI18n();
  const dayFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), { day: "numeric" });
  const monthFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), { month: "short" });

  return (
    <Card className="border-zinc-200/80 bg-white">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-lg">{t("dashboard.widgets.upcomingTasks.title")}</CardTitle>
        <Button type="button" variant="ghost" className="h-auto text-xs" onClick={onOpenAll}>
          {t("dashboard.widgets.viewAll")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length ? tasks.map((task) => {
          const isCompleting = completingTaskIds.has(task.id);

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors duration-300 motion-reduce:transition-none",
                isCompleting
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-zinc-200 bg-zinc-50/40",
              )}
            >
              <div className={cn(
                "flex size-10 shrink-0 flex-col items-center justify-center rounded-md border bg-white leading-none transition-colors duration-300 motion-reduce:transition-none",
                isCompleting ? "border-emerald-200 text-emerald-700" : "border-zinc-200 text-zinc-700",
              )}>
                <span className="text-sm font-semibold">{dayFormatter.format(task.dueDate)}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase">{monthFormatter.format(task.dueDate)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "truncate text-sm font-medium transition-colors duration-300 motion-reduce:transition-none",
                  isCompleting ? "text-emerald-700 line-through opacity-70" : "text-zinc-900",
                )}>
                  {task.title}
                </p>
                <p className={cn("text-xs", isCompleting ? "text-emerald-700/70" : "text-zinc-600")}>
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
              <Checkbox
                checked={isCompleting}
                disabled={!canEdit || isCompleting}
                aria-label={t("dashboard.widgets.upcomingTasks.completeAction", { title: task.title })}
                onCheckedChange={(checked) => {
                  if (checked === true) onCompleteTask(task.id);
                }}
              />
            </div>
          );
        }) : <p className="py-3 text-sm text-zinc-500">{t("dashboard.widgets.upcomingTasks.empty")}</p>}
      </CardContent>
    </Card>
  );
}
