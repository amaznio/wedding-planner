"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "high" | "medium" | "low";
type LinkedItem = { id: string; name: string };
type TaskGroup = LinkedItem & { _count: { tasks: number } };
type Membership = { id: string; user: { name: string } };
type ChecklistDraft = { title: string; completed: boolean };
type TaskForm = { title: string; dueDate: string; status: TaskStatus; priority: TaskPriority; eventId: string; groupId: string; assigneeMembershipId: string; checklistItems: ChecklistDraft[] };

const noneValue = "__none__";
const emptyForm: TaskForm = { title: "", dueDate: "", status: "todo", priority: "medium", eventId: noneValue, groupId: noneValue, assigneeMembershipId: noneValue, checklistItems: [] };

export function CreateWeddingTaskDialog({ weddingId, open, onOpenChange, onCreated }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [events, setEvents] = useState<LinkedItem[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/task-groups`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/members`, { cache: "no-store" }),
    ]).then(async ([weddingResponse, groupsResponse, membersResponse]) => {
      if (weddingResponse.ok) setEvents(((await weddingResponse.json()) as { wedding: { events: LinkedItem[] } }).wedding.events ?? []);
      if (groupsResponse.ok) setGroups(((await groupsResponse.json()) as { groups: TaskGroup[] }).groups ?? []);
      if (membersResponse.ok) setMembers(((await membersResponse.json()) as { members: Membership[] }).members ?? []);
    });
  }, [open, weddingId]);

  const close = () => {
    setForm(emptyForm);
    setError(null);
    onOpenChange(false);
  };

  const save = async () => {
    if (!form.title.trim() || form.checklistItems.some((item) => !item.title.trim())) {
      setError(t("tasks.page.errors.invalidForm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
          priority: form.priority,
          status: deriveStatus(form.checklistItems, form.status),
          eventId: nullable(form.eventId),
          groupId: nullable(form.groupId),
          assigneeMembershipId: nullable(form.assigneeMembershipId),
        }),
      });
      if (!response.ok) throw new Error(t("tasks.page.errors.save"));
      const { task } = await response.json() as { task: { id: string } };
      for (const [index, item] of form.checklistItems.entries()) {
        const itemResponse = await fetch(`/api/weddings/${weddingId}/tasks/${task.id}/checklist-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.title.trim(), completed: item.completed, sortOrder: index }),
        });
        if (!itemResponse.ok) throw new Error(t("tasks.page.errors.save"));
      }
      await onCreated?.();
      close();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("tasks.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("tasks.page.dialog.createTitle")}</DialogTitle><DialogDescription>{t("tasks.page.dialog.description")}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Field label={t("tasks.page.form.title")}><Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("tasks.page.form.dueDate")}><Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
            <Field label={t("tasks.page.form.priority")}><Choice value={form.priority} options={["high", "medium", "low"]} label={(value) => t(`tasks.page.priority.${value}`)} onChange={(value) => setForm((current) => ({ ...current, priority: value as TaskPriority }))} /></Field>
            <Field label={t("tasks.page.form.status")}><Choice value={form.status} disabled={form.checklistItems.length > 0} options={["todo", "in_progress", "done"]} label={(value) => t(`tasks.page.status.${value}`)} onChange={(value) => setForm((current) => ({ ...current, status: value as TaskStatus }))} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("tasks.page.form.event")}><Choice value={form.eventId} options={[noneValue, ...events.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.noEvent") : events.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, eventId: value }))} /></Field>
            <Field label={t("tasks.page.form.group")}><Choice value={form.groupId} options={[noneValue, ...groups.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.ungrouped") : groups.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, groupId: value }))} /></Field>
            <Field label={t("tasks.page.form.assignee")}><Choice value={form.assigneeMembershipId} options={[noneValue, ...members.map((item) => item.id)]} label={(value) => value === noneValue ? t("tasks.page.unassigned") : members.find((item) => item.id === value)?.user.name ?? value} onChange={(value) => setForm((current) => ({ ...current, assigneeMembershipId: value }))} /></Field>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between"><label className="text-sm font-medium">{t("tasks.page.form.checklist")}</label><Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, checklistItems: [...current.checklistItems, { title: "", completed: false }] }))}><Plus className="size-3.5" />{t("tasks.page.form.addChecklistItem")}</Button></div>
            {form.checklistItems.map((item, index) => <div key={index} className="flex items-center gap-2"><Checkbox checked={item.completed} onCheckedChange={(checked) => setForm((current) => ({ ...current, checklistItems: current.checklistItems.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, completed: checked === true } : candidate) }))} /><Input value={item.title} onChange={(event) => setForm((current) => ({ ...current, checklistItems: current.checklistItems.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, title: event.target.value } : candidate) }))} placeholder={t("tasks.page.form.checklistPlaceholder")} /><Button type="button" variant="ghost" size="icon" onClick={() => setForm((current) => ({ ...current, checklistItems: current.checklistItems.filter((_, candidateIndex) => candidateIndex !== index) }))}><X className="size-4" /></Button></div>)}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><label className="text-sm font-medium text-zinc-900">{label}</label>{children}</div>; }
function Choice({ value, options, label, onChange, disabled = false }: { value: string; options: string[]; label: (value: string) => string; onChange: (value: string) => void; disabled?: boolean }) { return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}</SelectContent></Select>; }
function nullable(value: string) { return value === noneValue ? null : value; }
function deriveStatus(items: ChecklistDraft[], fallback: TaskStatus): TaskStatus { if (!items.length) return fallback; const completed = items.filter((item) => item.completed).length; if (!completed) return "todo"; return completed === items.length ? "done" : "in_progress"; }
