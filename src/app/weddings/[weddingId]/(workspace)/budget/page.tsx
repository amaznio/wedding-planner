"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { AppDataTable } from "@/components/app/AppDataTable";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatCard } from "@/components/app/AppStatCard";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { useI18n } from "@/i18n/provider";

type ExpenseStatus = "planned" | "committed" | "paid" | "reimbursed" | "canceled";

type Expense = {
  id: string;
  title: string;
  category: string;
  amountMinor: number;
  currency: string;
  status: ExpenseStatus;
  incurredAt: string;
  paidBy: string | null;
  notes: string | null;
  eventId: string | null;
  vendorId: string | null;
  event?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
};

type WeddingResponse = {
  access: { canEdit: boolean };
  wedding: { currency: string };
};

type ExpenseForm = {
  title: string;
  category: string;
  amount: string;
  status: ExpenseStatus;
  incurredAt: string;
  paidBy: string;
  notes: string;
};

const statuses: ExpenseStatus[] = ["planned", "committed", "paid", "reimbursed", "canceled"];

const emptyForm: ExpenseForm = {
  title: "",
  category: "",
  amount: "",
  status: "planned",
  incurredAt: "",
  paidBy: "",
  notes: "",
};

export default function WeddingBudgetPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState("PLN");
  const [canEdit, setCanEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  const load = useCallback(async () => {
    const [expensesResponse, weddingResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/expenses`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    ]);
    if (!expensesResponse.ok) throw new Error(t("budget.page.errors.load"));

    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
      setCurrency(weddingData.wedding.currency ?? "PLN");
    }

    const data = (await expensesResponse.json()) as { expenses: Expense[] };
    setExpenses(data.expenses ?? []);
  }, [t, weddingId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await load();
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t("budget.page.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load, t]);

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => statusFilter === "all" || expense.status === statusFilter),
    [expenses, statusFilter],
  );

  const activeExpenses = expenses.filter((expense) => expense.status !== "canceled");
  const totalMinor = activeExpenses.reduce((sum, expense) => sum + expense.amountMinor, 0);
  const paidMinor = activeExpenses
    .filter((expense) => expense.status === "paid" || expense.status === "reimbursed")
    .reduce((sum, expense) => sum + expense.amountMinor, 0);
  const committedMinor = activeExpenses
    .filter((expense) => expense.status === "committed")
    .reduce((sum, expense) => sum + expense.amountMinor, 0);
  const plannedMinor = activeExpenses
    .filter((expense) => expense.status === "planned")
    .reduce((sum, expense) => sum + expense.amountMinor, 0);

  if (isLoading) {
    return <WorkspaceRouteLoading />;
  }

  const openCreateDialog = () => {
    setForm({ ...emptyForm, incurredAt: toDateInputValue(new Date()) });
    setEditingExpenseId(null);
    setError(null);
    setDialogMode("create");
  };

  const openEditDialog = (expense: Expense) => {
    setForm({
      title: expense.title,
      category: expense.category,
      amount: formatMajorAmount(expense.amountMinor),
      status: expense.status,
      incurredAt: expense.incurredAt ? expense.incurredAt.slice(0, 10) : "",
      paidBy: expense.paidBy ?? "",
      notes: expense.notes ?? "",
    });
    setEditingExpenseId(expense.id);
    setError(null);
    setDialogMode("edit");
  };

  const saveExpense = async () => {
    if (!canEdit || !dialogMode) return;
    const amountMinor = parseAmountToMinor(form.amount);
    if (!form.title.trim() || !form.category.trim() || amountMinor === null) {
      setError(t("budget.page.errors.invalidForm"));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        amountMinor,
        currency,
        status: form.status,
        incurredAt: form.incurredAt ? new Date(`${form.incurredAt}T00:00:00`).toISOString() : undefined,
        paidBy: form.paidBy.trim() || null,
        notes: form.notes.trim() || null,
      };
      const url = dialogMode === "edit" && editingExpenseId
        ? `/api/weddings/${weddingId}/expenses/${editingExpenseId}`
        : `/api/weddings/${weddingId}/expenses`;
      const response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("budget.page.errors.save"));
      await load();
      setDialogMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("budget.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!canEdit || !deleteExpenseId) return;
    const response = await fetch(`/api/weddings/${weddingId}/expenses/${deleteExpenseId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("budget.page.errors.delete"));
    await load();
    setDeleteExpenseId(null);
  };

  const expensePendingDelete = expenses.find((expense) => expense.id === deleteExpenseId) ?? null;

  return (
    <AppWorkspacePage>
      <WorkspacePageHeader
        title={t("budget.page.title")}
        subtitle={t("budget.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("budget.page.actions.add")}
          </Button>
        )}
      />

      <AppPageGrid className="mt-5 md:grid-cols-4">
        <AppStatCard title={t("budget.page.stats.total")} value={formatCurrency(totalMinor, currency, locale)} />
        <AppStatCard title={t("budget.page.stats.paid")} value={formatCurrency(paidMinor, currency, locale)} />
        <AppStatCard title={t("budget.page.stats.committed")} value={formatCurrency(committedMinor, currency, locale)} />
        <AppStatCard title={t("budget.page.stats.planned")} value={formatCurrency(plannedMinor, currency, locale)} />
      </AppPageGrid>

      <div className="mt-5">
        <AppSectionCard title={t("budget.page.table.title")} description={t("budget.page.table.description")}>
          <div className="mb-4 max-w-xs">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExpenseStatus | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("budget.page.filters.all")}</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{t(`budget.page.status.${status}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AppDataTable
            columns={[
              { key: "title", label: t("budget.page.table.columns.title") },
              { key: "category", label: t("budget.page.table.columns.category") },
              { key: "amount", label: t("budget.page.table.columns.amount"), align: "right" },
              { key: "status", label: t("budget.page.table.columns.status") },
              { key: "linked", label: t("budget.page.table.columns.linked") },
              { key: "actions", label: "", align: "right" },
            ]}
            rows={filteredExpenses.map((expense) => ({
              id: expense.id,
              title: expense.title,
              category: expense.category,
              amount: formatCurrency(expense.amountMinor, expense.currency, locale),
              status: <AppStatusBadge label={t(`budget.page.status.${expense.status}`)} variant={expense.status === "paid" ? "success" : expense.status === "committed" ? "secondary" : "default"} />,
              linked: expense.vendor?.name ?? expense.event?.name ?? "-",
              actions: (
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(expense)} disabled={!canEdit} aria-label={t("budget.page.actions.edit")}>
                    <Edit3 className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteExpenseId(expense.id)} disabled={!canEdit} aria-label={t("budget.page.actions.delete")}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            }))}
            emptyLabel={t("budget.page.empty")}
          />
        </AppSectionCard>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("budget.page.dialog.editTitle") : t("budget.page.dialog.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveExpense();
            }}
          >
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("budget.page.form.title")} />
            <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder={t("budget.page.form.category")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder={t("budget.page.form.amount")} />
              <Input type="date" value={form.incurredAt} onChange={(event) => setForm((current) => ({ ...current, incurredAt: event.target.value }))} />
            </div>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as ExpenseStatus }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{t(`budget.page.status.${status}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={form.paidBy} onChange={(event) => setForm((current) => ({ ...current, paidBy: event.target.value }))} placeholder={t("budget.page.form.paidBy")} />
            <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("budget.page.form.notes")} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteExpenseId !== null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        title={t("budget.page.delete.title")}
        description={expensePendingDelete ? t("budget.page.delete.description", { title: expensePendingDelete.title }) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteExpense}
      />
    </AppWorkspacePage>
  );
}

function formatCurrency(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatMajorAmount(amountMinor: number): string {
  return String(amountMinor / 100);
}

function parseAmountToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
