"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, ListChecks, Plus, Search, Settings2, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";

import { AppFilterBar } from "@/components/app/AppFilterBar";
import { AppFormField } from "@/components/app/AppFormField";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkspaceManagementPageLoading } from "@/features/wedding-dashboard/components/WorkspacePageLoading";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { CreateWeddingTaskDialog } from "@/features/wedding-tasks/components/CreateWeddingTaskDialog";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "high" | "medium" | "low";
type GroupBy = "group" | "event" | "status" | "none";

type LinkedItem = { id: string; name: string };
type TaskGroup = LinkedItem & { _count: { tasks: number } };
type Membership = { id: string; user: { id: string; name: string; email: string; image: string | null } };
type ChecklistItem = { id: string; title: string; completed: boolean; sortOrder: number };
type WeddingTask = {
  id: string;
  title: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  eventId: string | null;
  groupId: string | null;
  assigneeMembershipId: string | null;
  event: LinkedItem | null;
  group: LinkedItem | null;
  assigneeMembership: Membership | null;
  checklistItems: ChecklistItem[];
};

type ChecklistDraft = { id?: string; title: string; completed: boolean; sortOrder: number };
type TaskForm = {
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  eventId: string;
  groupId: string;
  assigneeMembershipId: string;
  checklistItems: ChecklistDraft[];
};

const noneValue = "__none__";
const statuses: Array<TaskStatus | "all"> = ["all", "todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["high", "medium", "low"];
const groupByOptions: GroupBy[] = ["group", "event", "status", "none"];
const emptyForm: TaskForm = {
  title: "",
  dueDate: "",
  status: "todo",
  priority: "medium",
  eventId: noneValue,
  groupId: noneValue,
  assigneeMembershipId: noneValue,
  checklistItems: [],
};

export function WeddingTasksPage() {
  const { t, locale } = useI18n();
  const { weddingId } = useParams<{ weddingId: string }>();
  const [tasks, setTasks] = useState<WeddingTask[]>([]);
  const [events, setEvents] = useState<LinkedItem[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("group");
  const [createOpen, setCreateOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"edit" | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tasksResponse, weddingResponse, groupsResponse, membersResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/tasks`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/task-groups`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/members`, { cache: "no-store" }),
    ]);
    if (!tasksResponse.ok || !groupsResponse.ok || !membersResponse.ok) throw new Error(t("tasks.page.errors.load"));

    const [tasksData, weddingData, groupsData, membersData] = await Promise.all([
      tasksResponse.json() as Promise<{ tasks: WeddingTask[] }>,
      weddingResponse.ok ? weddingResponse.json() as Promise<{ access: { canEdit: boolean }; wedding: { events: LinkedItem[] } }> : null,
      groupsResponse.json() as Promise<{ groups: TaskGroup[] }>,
      membersResponse.json() as Promise<{ access: { canEdit: boolean }; members: Membership[] }>,
    ]);
    setTasks(tasksData.tasks ?? []);
    setGroups(groupsData.groups ?? []);
    setMembers(membersData.members ?? []);
    setCanEdit(weddingData?.access?.canEdit ?? membersData.access?.canEdit ?? false);
    setEvents(weddingData?.wedding.events ?? []);
  }, [t, weddingId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await load();
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t("tasks.page.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [load, t]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter((task) => !normalized || [
        task.title,
        task.event?.name,
        task.group?.name,
        task.assigneeMembership?.user.name,
        ...task.checklistItems.map((item) => item.title),
      ].filter(Boolean).join(" ").toLowerCase().includes(normalized))
      .sort(compareTasks);
  }, [query, statusFilter, tasks]);

  const taskSections = useMemo(() => buildSections(visibleTasks, groupBy, t), [groupBy, t, visibleTasks]);

  if (isLoading) {
    return (
      <WorkspaceManagementPageLoading
        title={t("tasks.page.title")}
        subtitle={t("tasks.page.subtitle")}
        primaryActionLabel={t("tasks.page.actions.add")}
        secondaryActionLabel={t("tasks.page.actions.manageGroups")}
      />
    );
  }

  const openCreateDialog = () => {
    setCreateOpen(true);
  };

  const openEditDialog = (task: WeddingTask) => {
    setForm({
      title: task.title,
      dueDate: task.dueDate?.slice(0, 10) ?? "",
      status: task.status,
      priority: task.priority,
      eventId: task.eventId ?? noneValue,
      groupId: task.groupId ?? noneValue,
      assigneeMembershipId: task.assigneeMembershipId ?? noneValue,
      checklistItems: task.checklistItems.map((item) => ({ ...item })),
    });
    setEditingTaskId(task.id);
    setError(null);
    setDialogMode("edit");
  };

  const saveTask = async () => {
    if (!canEdit || !dialogMode || !form.title.trim()) {
      setError(t("tasks.page.errors.invalidForm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const checklistStatus = form.checklistItems.length ? derivedStatus(form.checklistItems) : null;
      const existingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;
      const isRemovingEntireChecklist = Boolean(existingTask?.checklistItems.length && !form.checklistItems.length);
      const payload = {
        title: form.title.trim(),
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
        priority: form.priority,
        status: editingTaskId && (checklistStatus === "in_progress" || isRemovingEntireChecklist)
          ? undefined
          : checklistStatus ?? form.status,
        eventId: toNullable(form.eventId),
        groupId: toNullable(form.groupId),
        assigneeMembershipId: toNullable(form.assigneeMembershipId),
      };
      const url = dialogMode === "edit" && editingTaskId
        ? `/api/weddings/${weddingId}/tasks/${editingTaskId}`
        : `/api/weddings/${weddingId}/tasks`;
      const response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("tasks.page.errors.save"));
      const saved = await response.json() as { task: WeddingTask };
      await syncChecklist(saved.task, form.checklistItems);
      if (isRemovingEntireChecklist && form.status !== "todo") {
        const statusResponse = await fetch(`/api/weddings/${weddingId}/tasks/${saved.task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: form.status }),
        });
        if (!statusResponse.ok) throw new Error(t("tasks.page.errors.save"));
      }
      await load();
      setDialogMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("tasks.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const syncChecklist = async (task: WeddingTask, drafts: ChecklistDraft[]) => {
    const draftIds = new Set(drafts.flatMap((item) => item.id ? [item.id] : []));
    for (const existing of task.checklistItems) {
      if (!draftIds.has(existing.id)) {
        const response = await fetch(`/api/weddings/${weddingId}/tasks/${task.id}/checklist-items/${existing.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error(t("tasks.page.errors.save"));
      }
    }
    for (const [index, item] of drafts.entries()) {
      const url = item.id
        ? `/api/weddings/${weddingId}/tasks/${task.id}/checklist-items/${item.id}`
        : `/api/weddings/${weddingId}/tasks/${task.id}/checklist-items`;
      const response = await fetch(url, {
        method: item.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title.trim(), completed: item.completed, sortOrder: index }),
      });
      if (!response.ok) throw new Error(t("tasks.page.errors.save"));
    }
  };

  const deleteTask = async () => {
    if (!deleteTaskId) return;
    const response = await fetch(`/api/weddings/${weddingId}/tasks/${deleteTaskId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("tasks.page.errors.delete"));
    await load();
  };

  const toggleChecklistItem = async (task: WeddingTask, item: ChecklistItem) => {
    if (!canEdit) return;
    const response = await fetch(`/api/weddings/${weddingId}/tasks/${task.id}/checklist-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    if (!response.ok) {
      setError(t("tasks.page.errors.save"));
      return;
    }
    await load();
  };

  const saveGroup = async () => {
    if (!canEdit || !groupName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editingGroupId ? `/api/weddings/${weddingId}/task-groups/${editingGroupId}` : `/api/weddings/${weddingId}/task-groups`,
        {
          method: editingGroupId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName.trim() }),
        },
      );
      if (!response.ok) throw new Error(t("tasks.page.errors.groupSave"));
      setGroupName("");
      setEditingGroupId(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("tasks.page.errors.groupSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGroup = async () => {
    if (!deleteGroupId) return;
    const response = await fetch(`/api/weddings/${weddingId}/task-groups/${deleteGroupId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("tasks.page.errors.groupDelete"));
    await load();
  };

  const taskPendingDelete = tasks.find((task) => task.id === deleteTaskId);
  const groupPendingDelete = groups.find((group) => group.id === deleteGroupId);

  return (
    <AppWorkspacePage>
      <WeddingPageHeader
        title={t("tasks.page.title")}
        subtitle={t("tasks.page.subtitle")}
        actions={(
          <>
            <Button type="button" variant="outline" onClick={() => { setError(null); setGroupsOpen(true); }} disabled={!canEdit}>
              <Settings2 className="size-4" />
              {t("tasks.page.actions.manageGroups")}
            </Button>
            <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
              <Plus className="size-4" />
              {t("tasks.page.actions.add")}
            </Button>
          </>
        )}
      />
      <AppStatsRail
        className="mt-5 max-w-xl"
        items={[
          { label: t("tasks.page.stats.todo"), value: tasks.filter((task) => task.status === "todo").length },
          { label: t("tasks.page.stats.inProgress"), value: tasks.filter((task) => task.status === "in_progress").length },
          { label: t("tasks.page.stats.done"), value: tasks.filter((task) => task.status === "done").length },
        ]}
      />

      <AppFilterBar className="mt-5">
        <InputGroup className="max-w-md flex-1">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("tasks.page.filters.search")} />
        </InputGroup>
        <AppFormField className="sm:w-auto" label={t("tasks.page.filters.status")}>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
            <SelectTrigger className="w-full sm:w-44" aria-label={t("tasks.page.filters.status")}><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status === "all" ? t("tasks.page.filters.allStatuses") : t(`tasks.page.status.${status}`)}</SelectItem>)}</SelectContent>
          </Select>
        </AppFormField>
        <AppFormField className="sm:w-auto" label={t("tasks.page.filters.groupBy")}>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
            <SelectTrigger className="w-full sm:w-64" aria-label={t("tasks.page.filters.groupBy")}><SelectValue /></SelectTrigger>
            <SelectContent>{groupByOptions.map((option) => <SelectItem key={option} value={option}>{t(`tasks.page.groupBy.${option}`)}</SelectItem>)}</SelectContent>
          </Select>
        </AppFormField>
      </AppFilterBar>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-5 grid gap-6">
        {taskSections.map((section) => (
          <section key={section.key}>
            {groupBy !== "none" ? (
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">{section.label}</h2>
                <span className="text-xs text-zinc-500">{section.tasks.length}</span>
              </div>
            ) : null}
            <TaskTable
              tasks={section.tasks}
              canEdit={canEdit}
              locale={locale}
              t={t}
              onEdit={openEditDialog}
              onDelete={setDeleteTaskId}
              onToggleChecklist={toggleChecklistItem}
            />
          </section>
        ))}
        {!taskSections.length ? <p className="text-sm text-zinc-600">{t("tasks.page.empty")}</p> : null}
      </div>

      <CreateWeddingTaskDialog weddingId={weddingId} open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />

      <TaskDialog
        open={dialogMode !== null}
        mode={dialogMode}
        form={form}
        setForm={setForm}
        events={events}
        groups={groups}
        members={members}
        error={error}
        isSaving={isSaving}
        t={t}
        onClose={() => setDialogMode(null)}
        onSave={saveTask}
      />

      <Dialog open={groupsOpen} onOpenChange={setGroupsOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-xl" closeLabel={t("common.close")}>
          <DialogHeader className="border-b border-zinc-200 px-6 py-5 pr-12">
            <DialogTitle className="text-xl">{t("tasks.page.groups.title")}</DialogTitle>
            <DialogDescription>{t("tasks.page.groups.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-6 overflow-y-auto px-6 py-5">
            <section className="grid gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{editingGroupId ? t("tasks.page.groups.editSectionTitle") : t("tasks.page.groups.createSectionTitle")}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{editingGroupId ? t("tasks.page.groups.editSectionDescription") : t("tasks.page.groups.createSectionDescription")}</p>
              </div>
              <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); void saveGroup(); }}>
                <div className="grid gap-2">
                  <label htmlFor="task-group-name" className="text-sm font-medium text-zinc-900">{t("tasks.page.groups.nameLabel")}</label>
                  <Input id="task-group-name" autoFocus value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder={t("tasks.page.groups.namePlaceholder")} />
                </div>
                <div className="flex items-end gap-2">
                  {editingGroupId ? <Button type="button" variant="outline" onClick={() => { setEditingGroupId(null); setGroupName(""); }}>{t("common.cancel")}</Button> : null}
                  <Button type="submit" variant="primary" disabled={isSaving || !groupName.trim()}>{editingGroupId ? t("common.save") : t("tasks.page.groups.add")}</Button>
                </div>
              </form>
            </section>

            <section className="grid gap-3 border-t border-zinc-200 pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("tasks.page.groups.existingTitle")}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{t("tasks.page.groups.existingDescription")}</p>
                </div>
                <span className="text-xs font-medium text-zinc-500">{groups.length}</span>
              </div>
              <div className="grid gap-2">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{group.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{t("tasks.page.groups.taskCount", { count: group._count.tasks })}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label={t("tasks.page.groups.editAction")} onClick={() => { setEditingGroupId(group.id); setGroupName(group.name); }}><Edit3 className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={t("tasks.page.groups.deleteAction")} onClick={() => setDeleteGroupId(group.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                ))}
                {!groups.length ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-zinc-700">{t("tasks.page.groups.empty")}</p>
                    <p className="mt-1 text-xs text-zinc-500">{t("tasks.page.groups.emptyDescription")}</p>
                  </div>
                ) : null}
              </div>
            </section>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setGroupsOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteTaskId !== null} onOpenChange={(open) => !open && setDeleteTaskId(null)} title={t("tasks.page.delete.title")} description={taskPendingDelete ? t("tasks.page.delete.description", { title: taskPendingDelete.title }) : undefined} confirmLabel={t("common.delete")} cancelLabel={t("common.cancel")} onConfirm={deleteTask} />
      <ConfirmDialog open={deleteGroupId !== null} onOpenChange={(open) => !open && setDeleteGroupId(null)} title={t("tasks.page.groups.deleteTitle")} description={groupPendingDelete ? t("tasks.page.groups.deleteDescription", { name: groupPendingDelete.name }) : undefined} confirmLabel={t("common.delete")} cancelLabel={t("common.cancel")} onConfirm={deleteGroup} />
    </AppWorkspacePage>
  );
}

function TaskTable({ tasks, canEdit, locale, t, onEdit, onDelete, onToggleChecklist }: {
  tasks: WeddingTask[];
  canEdit: boolean;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onEdit: (task: WeddingTask) => void;
  onDelete: (id: string) => void;
  onToggleChecklist: (task: WeddingTask, item: ChecklistItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <Table>
        <TableHeader className="bg-zinc-50/80"><TableRow>
          <TableHead className="px-4">{t("tasks.page.table.columns.task")}</TableHead>
          <TableHead className="px-4">{t("tasks.page.table.columns.links")}</TableHead>
          <TableHead className="px-4">{t("tasks.page.table.columns.assignee")}</TableHead>
          <TableHead className="px-4">{t("tasks.page.table.columns.due")}</TableHead>
          <TableHead className="px-4">{t("tasks.page.table.columns.priority")}</TableHead>
          <TableHead className="px-4">{t("tasks.page.table.columns.status")}</TableHead>
          <TableHead className="px-4" />
        </TableRow></TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const completed = task.checklistItems.filter((item) => item.completed).length;
            const overdue = isOverdue(task);
            return (
              <TableRow key={task.id} className={cn(overdue && "bg-red-50/60 hover:bg-red-50")}>
                <TableCell className="min-w-64 px-4 py-3.5">
                  <p className="font-medium text-zinc-900">{task.title}</p>
                  {task.checklistItems.length ? (
                    <div className="mt-2 grid gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><ListChecks className="size-3.5" />{completed}/{task.checklistItems.length}</span>
                      {task.checklistItems.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-xs text-zinc-600">
                          <Checkbox className="size-4" checked={item.completed} disabled={!canEdit} onCheckedChange={() => void onToggleChecklist(task, item)} />
                          <span className={cn(item.completed && "line-through text-zinc-400")}>{item.title}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-xs text-zinc-600"><div className="grid gap-1"><span>{task.group?.name ?? t("tasks.page.ungrouped")}</span><span>{task.event?.name ?? t("tasks.page.noEvent")}</span></div></TableCell>
                <TableCell className="px-4 py-3.5">{task.assigneeMembership?.user.name ?? "-"}</TableCell>
                <TableCell className={cn("px-4 py-3.5", overdue && "font-medium text-red-700")}>{task.dueDate ? formatDate(task.dueDate, locale) : "-"}</TableCell>
                <TableCell className="px-4 py-3.5">{t(`tasks.page.priority.${task.priority}`)}</TableCell>
                <TableCell className="px-4 py-3.5"><AppStatusBadge label={t(`tasks.page.status.${task.status}`)} variant={task.status === "done" ? "success" : task.status === "in_progress" ? "secondary" : "default"} /></TableCell>
                <TableCell className="px-4 py-3.5"><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" disabled={!canEdit} onClick={() => onEdit(task)}><Edit3 className="size-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={!canEdit} onClick={() => onDelete(task.id)}><Trash2 className="size-4" /></Button></div></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TaskDialog({ open, mode, form, setForm, events, groups, members, error, isSaving, t, onClose, onSave }: {
  open: boolean;
  mode: "create" | "edit" | null;
  form: TaskForm;
  setForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  events: LinkedItem[];
  groups: TaskGroup[];
  members: Membership[];
  error: string | null;
  isSaving: boolean;
  t: (key: string) => string;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{mode === "edit" ? t("tasks.page.dialog.editTitle") : t("tasks.page.dialog.createTitle")}</DialogTitle><DialogDescription>{t("tasks.page.dialog.description")}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label={t("tasks.page.form.title")}><Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("tasks.page.form.dueDate")}><Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
            <Field label={t("tasks.page.form.priority")}><TaskSelect value={form.priority} values={priorities} label={(value) => t(`tasks.page.priority.${value}`)} onChange={(value) => setForm((current) => ({ ...current, priority: value as TaskPriority }))} /></Field>
            <Field label={t("tasks.page.form.status")}><TaskSelect value={form.status} values={["todo", "in_progress", "done"]} label={(value) => t(`tasks.page.status.${value}`)} disabled={form.checklistItems.length > 0} onChange={(value) => setForm((current) => ({ ...current, status: value as TaskStatus }))} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("tasks.page.form.event")}><TaskSelect value={form.eventId} values={[noneValue, ...events.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.noEvent") : events.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, eventId: value }))} /></Field>
            <Field label={t("tasks.page.form.group")}><TaskSelect value={form.groupId} values={[noneValue, ...groups.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.ungrouped") : groups.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, groupId: value }))} /></Field>
            <Field label={t("tasks.page.form.assignee")}><TaskSelect value={form.assigneeMembershipId} values={[noneValue, ...members.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.unassigned") : members.find((item) => item.id === value)?.user.name ?? value} onChange={(value) => setForm((current) => ({ ...current, assigneeMembershipId: value }))} /></Field>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between"><label className="text-sm font-medium">{t("tasks.page.form.checklist")}</label><Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, checklistItems: [...current.checklistItems, { title: "", completed: false, sortOrder: current.checklistItems.length }] }))}><Plus className="size-3.5" />{t("tasks.page.form.addChecklistItem")}</Button></div>
            {form.checklistItems.map((item, index) => (
              <div key={item.id ?? index} className="flex items-center gap-2">
                <Checkbox checked={item.completed} onCheckedChange={(checked) => setForm((current) => ({ ...current, checklistItems: current.checklistItems.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, completed: checked === true } : candidate) }))} />
                <Input value={item.title} onChange={(event) => setForm((current) => ({ ...current, checklistItems: current.checklistItems.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, title: event.target.value } : candidate) }))} placeholder={t("tasks.page.form.checklistPlaceholder")} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setForm((current) => ({ ...current, checklistItems: current.checklistItems.filter((_, candidateIndex) => candidateIndex !== index) }))}><X className="size-4" /></Button>
              </div>
            ))}
            {form.checklistItems.length ? <p className="text-xs text-zinc-500">{t("tasks.page.form.checklistStatusHelp")}</p> : null}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving || !form.title.trim() || form.checklistItems.some((item) => !item.title.trim())}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><label className="text-sm font-medium text-zinc-900">{label}</label>{children}</div>;
}

function TaskSelect({ value, values, label, onChange, disabled = false }: { value: string; values: string[]; label: (value: string) => string; onChange: (value: string) => void; disabled?: boolean }) {
  return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger className="w-full" aria-label={label(value)}><SelectValue /></SelectTrigger><SelectContent>{values.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}</SelectContent></Select>;
}

function buildSections(tasks: WeddingTask[], groupBy: GroupBy, t: (key: string) => string) {
  if (groupBy === "none") return tasks.length ? [{ key: "all", label: "", tasks }] : [];
  const sections = new Map<string, { key: string; label: string; tasks: WeddingTask[]; ungrouped: boolean }>();
  for (const task of tasks) {
    const value = groupBy === "group" ? task.group : groupBy === "event" ? task.event : { id: task.status, name: t(`tasks.page.status.${task.status}`) };
    const key = value?.id ?? "__ungrouped__";
    const label = value?.name ?? t("tasks.page.ungrouped");
    const existing = sections.get(key) ?? { key, label, tasks: [], ungrouped: !value };
    existing.tasks.push(task);
    sections.set(key, existing);
  }
  return [...sections.values()].sort((left, right) => Number(left.ungrouped) - Number(right.ungrouped) || left.label.localeCompare(right.label));
}

function compareTasks(left: WeddingTask, right: WeddingTask) {
  if (!left.dueDate && !right.dueDate) return left.title.localeCompare(right.title);
  if (!left.dueDate) return 1;
  if (!right.dueDate) return -1;
  return left.dueDate.localeCompare(right.dueDate) || left.title.localeCompare(right.title);
}

function derivedStatus(items: ChecklistDraft[]): TaskStatus {
  const completed = items.filter((item) => item.completed).length;
  if (!completed) return "todo";
  return completed === items.length ? "done" : "in_progress";
}

function isOverdue(task: WeddingTask) {
  if (!task.dueDate || task.status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function toNullable(value: string) {
  return value === noneValue ? null : value;
}
