"use client";

import { AppDataTable } from "@/components/app/AppDataTable";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "high" | "medium" | "low";

type WeddingTask = {
  id: string;
  title: string;
  assignee: string;
  due: string;
  status: TaskStatus;
  priority: TaskPriority;
};

const mockTasks: WeddingTask[] = [
  { id: "t1", title: "Finalize venue timeline", assignee: "Adrian", due: "2026-06-05", status: "in_progress", priority: "high" },
  { id: "t2", title: "Confirm floral delivery", assignee: "Gabriela", due: "2026-06-08", status: "todo", priority: "medium" },
  { id: "t3", title: "Approve welcome sign print", assignee: "Planner", due: "2026-06-02", status: "done", priority: "low" },
];

export function WeddingTasksPage() {
  const { t } = useI18n();

  const todo = mockTasks.filter((task) => task.status === "todo").length;
  const inProgress = mockTasks.filter((task) => task.status === "in_progress").length;
  const done = mockTasks.filter((task) => task.status === "done").length;

  return (
    <AppWorkspacePage>
      <WeddingPageHeader title={t("tasks.page.title")} subtitle={t("tasks.page.subtitle")} />
      <AppStatsRail
        className="mt-5 max-w-xl"
        items={[
          { label: t("tasks.page.stats.todo"), value: todo },
          { label: t("tasks.page.stats.inProgress"), value: inProgress },
          { label: t("tasks.page.stats.done"), value: done },
        ]}
      />

      <div className="mt-5">
        <AppSectionCard title={t("tasks.page.table.title")} description={t("tasks.page.table.description")}>
          <AppDataTable
            columns={[
              { key: "task", label: t("tasks.page.table.columns.task") },
              { key: "assignee", label: t("tasks.page.table.columns.assignee") },
              { key: "due", label: t("tasks.page.table.columns.due") },
              { key: "priority", label: t("tasks.page.table.columns.priority") },
              { key: "status", label: t("tasks.page.table.columns.status"), align: "right" },
            ]}
            rows={mockTasks.map((task) => ({
              id: task.id,
              task: task.title,
              assignee: task.assignee,
              due: task.due,
              priority: t(`tasks.page.priority.${task.priority}`),
              status: (
                <AppStatusBadge
                  label={t(`tasks.page.status.${task.status}`)}
                  variant={task.status === "done" ? "success" : task.status === "in_progress" ? "secondary" : "default"}
                />
              ),
            }))}
            emptyLabel={t("tasks.page.empty")}
          />
        </AppSectionCard>
      </div>
    </AppWorkspacePage>
  );
}
