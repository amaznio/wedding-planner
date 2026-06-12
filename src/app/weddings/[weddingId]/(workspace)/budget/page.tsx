"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { AppDataTable } from "@/components/app/AppDataTable";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceManagementPageLoading } from "@/features/wedding-dashboard/components/WorkspacePageLoading";
import { CreateWeddingPaymentDialog } from "@/features/wedding-finances/components/CreateWeddingPaymentDialog";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
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
  wedding: { currency: string; events: Array<{ id: string; name: string }> };
};

type Vendor = {
  id: string;
  name: string;
  totalCostMinor: number;
  remainingMinor: number;
  paymentStatus: "not_started" | "partial" | "paid" | "canceled";
  lifecycleStatus: "considering" | "booked" | "contract_signed" | "canceled";
};

type ExpenseForm = {
  title: string;
  category: string;
  amount: string;
  status: ExpenseStatus;
  incurredAt: string;
  paidBy: string;
  notes: string;
  vendorId: string;
  eventId: string;
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
  vendorId: "",
  eventId: "",
};

export default function WeddingBudgetPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState("PLN");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  const load = useCallback(async () => {
    const [expensesResponse, weddingResponse, vendorsResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/expenses`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
    ]);
    if (!expensesResponse.ok) throw new Error(t("budget.page.errors.load"));

    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
      setCurrency(weddingData.wedding.currency ?? "PLN");
      setEvents(weddingData.wedding.events ?? []);
    }
    if (vendorsResponse.ok) {
      const vendorsData = (await vendorsResponse.json()) as { vendors: Vendor[] };
      setVendors(vendorsData.vendors ?? []);
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

  const activeVendors = vendors.filter((vendor) => vendor.lifecycleStatus !== "canceled");
  const commitmentsMinor = activeVendors.reduce((sum, vendor) => sum + vendor.totalCostMinor, 0);
  const remainingMinor = activeVendors.reduce((sum, vendor) => sum + vendor.remainingMinor, 0);
  const paidMinor = expenses
    .filter((expense) => expense.status === "paid")
    .reduce((sum, expense) => sum + expense.amountMinor, 0);
  const upcomingMinor = expenses
    .filter((expense) => expense.status === "planned" || expense.status === "committed")
    .reduce((sum, expense) => sum + expense.amountMinor, 0);

  if (isLoading) {
    return (
      <WorkspaceManagementPageLoading
        title={t("budget.page.title")}
        subtitle={t("budget.page.subtitle")}
        primaryActionLabel={t("budget.page.actions.add")}
        statsCount={4}
      />
    );
  }

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
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
      vendorId: expense.vendorId ?? "",
      eventId: expense.eventId ?? "",
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
        vendorId: form.vendorId || null,
        eventId: form.eventId || null,
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
      <WeddingPageHeader
        title={t("budget.page.title")}
        subtitle={t("budget.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("budget.page.actions.add")}
          </Button>
        )}
      />

      {error && dialogMode === null ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <AppStatsRail
        className="mt-5"
        items={[
          { label: t("budget.page.stats.total"), value: formatCurrency(commitmentsMinor, currency, locale) },
          { label: t("budget.page.stats.paid"), value: formatCurrency(paidMinor, currency, locale) },
          { label: t("budget.page.stats.remaining"), value: formatCurrency(remainingMinor, currency, locale) },
          { label: t("budget.page.stats.upcoming"), value: formatCurrency(upcomingMinor, currency, locale) },
        ]}
      />

      <section className="mt-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{t("budget.page.table.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{t("budget.page.table.description")}</p>
        </div>
        <div className="mt-4 max-w-xs">
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
        <div className="mt-4">
          <AppDataTable
            variant="standalone"
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
              category: expense.category === "Deposit" ? t("budget.page.categories.deposit") : expense.category,
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
        </div>
      </section>

      <CreateWeddingPaymentDialog
        weddingId={weddingId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={load}
      />

      <Dialog open={dialogMode === "edit"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("budget.page.dialog.editTitle")}</DialogTitle>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={form.vendorId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, vendorId: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("budget.page.form.vendor")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("budget.page.form.noVendor")}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.eventId || "none"} onValueChange={(value) => setForm((current) => ({ ...current, eventId: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("budget.page.form.event")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("budget.page.form.noEvent")}</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
