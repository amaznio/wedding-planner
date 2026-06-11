import type { WeddingTaskStatus } from "@prisma/client";

export function normalizeTaskGroupName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function deriveTaskStatusFromChecklist(total: number, completed: number): WeddingTaskStatus {
  if (completed === 0) return "todo";
  if (completed === total) return "done";
  return "in_progress";
}
