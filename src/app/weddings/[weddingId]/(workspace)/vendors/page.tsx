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
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspacePageHeader } from "@/features/wedding-dashboard/components/WorkspacePageHeader";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { useI18n } from "@/i18n/provider";

type VendorPaymentStatus = "not_started" | "partial" | "paid" | "canceled";

type WeddingEvent = {
  id: string;
  name: string;
};

type Vendor = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  totalCostMinor: number;
  depositMinor: number;
  amountPaidMinor: number;
  paymentStatus: VendorPaymentStatus;
  dueDate: string | null;
  vendorEvents: Array<{ eventId: string; event?: WeddingEvent }>;
};

type WeddingResponse = {
  access: { canEdit: boolean };
  wedding: { currency: string; events: WeddingEvent[] };
};

type VendorForm = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  totalCost: string;
  deposit: string;
  paid: string;
  paymentStatus: VendorPaymentStatus;
  dueDate: string;
  notes: string;
  eventIds: string[];
};

const statuses: VendorPaymentStatus[] = ["not_started", "partial", "paid", "canceled"];

const emptyForm: VendorForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  totalCost: "",
  deposit: "",
  paid: "",
  paymentStatus: "not_started",
  dueDate: "",
  notes: "",
  eventIds: [],
};

export default function WeddingVendorsPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [currency, setCurrency] = useState("PLN");
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);

  const load = useCallback(async () => {
    const [vendorsResponse, weddingResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    ]);
    if (!vendorsResponse.ok) throw new Error(t("vendors.page.errors.load"));

    const vendorsData = (await vendorsResponse.json()) as { vendors: Vendor[] };
    setVendors(vendorsData.vendors ?? []);

    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
      setCurrency(weddingData.wedding.currency ?? "PLN");
      setEvents(weddingData.wedding.events ?? []);
    }
  }, [t, weddingId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await load();
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : t("vendors.page.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load, t]);

  const totals = useMemo(
    () =>
      vendors.reduce(
        (acc, vendor) => {
          if (vendor.paymentStatus === "canceled") return acc;
          acc.total += vendor.totalCostMinor;
          acc.deposit += vendor.depositMinor;
          acc.paid += vendor.amountPaidMinor;
          return acc;
        },
        { total: 0, deposit: 0, paid: 0 },
      ),
    [vendors],
  );

  if (isLoading) {
    return <WorkspaceRouteLoading />;
  }

  const openCreateDialog = () => {
    setForm(emptyForm);
    setEditingVendorId(null);
    setError(null);
    setDialogMode("create");
  };

  const openEditDialog = (vendor: Vendor) => {
    setForm({
      name: vendor.name,
      contactName: vendor.contactName ?? "",
      contactEmail: vendor.contactEmail ?? "",
      contactPhone: vendor.contactPhone ?? "",
      totalCost: formatMajorAmount(vendor.totalCostMinor),
      deposit: formatMajorAmount(vendor.depositMinor),
      paid: formatMajorAmount(vendor.amountPaidMinor),
      paymentStatus: vendor.paymentStatus,
      dueDate: vendor.dueDate ? vendor.dueDate.slice(0, 10) : "",
      notes: vendor.notes ?? "",
      eventIds: vendor.vendorEvents.map((event) => event.eventId),
    });
    setEditingVendorId(vendor.id);
    setError(null);
    setDialogMode("edit");
  };

  const toggleEvent = (eventId: string) => {
    setForm((current) => ({
      ...current,
      eventIds: current.eventIds.includes(eventId)
        ? current.eventIds.filter((id) => id !== eventId)
        : [...current.eventIds, eventId],
    }));
  };

  const saveVendor = async () => {
    if (!canEdit || !dialogMode) return;
    const totalCostMinor = parseAmountToMinor(form.totalCost);
    const depositMinor = parseAmountToMinor(form.deposit || "0");
    const amountPaidMinor = parseAmountToMinor(form.paid || "0");
    if (!form.name.trim() || totalCostMinor === null || depositMinor === null || amountPaidMinor === null) {
      setError(t("vendors.page.errors.invalidForm"));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const basePayload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        notes: form.notes.trim() || null,
        totalCostMinor,
        depositMinor,
        amountPaidMinor,
        paymentStatus: form.paymentStatus,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
        eventIds: form.eventIds,
      };
      const payload = dialogMode === "create"
        ? Object.fromEntries(Object.entries(basePayload).filter(([, value]) => value !== null))
        : basePayload;
      const url = dialogMode === "edit" && editingVendorId
        ? `/api/weddings/${weddingId}/vendors/${editingVendorId}`
        : `/api/weddings/${weddingId}/vendors`;
      const response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("vendors.page.errors.save"));
      await load();
      setDialogMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("vendors.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!canEdit || !deleteVendorId) return;
    const response = await fetch(`/api/weddings/${weddingId}/vendors/${deleteVendorId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("vendors.page.errors.delete"));
    await load();
    setDeleteVendorId(null);
  };

  const vendorPendingDelete = vendors.find((vendor) => vendor.id === deleteVendorId) ?? null;

  return (
    <AppWorkspacePage>
      <WorkspacePageHeader
        title={t("vendors.page.title")}
        subtitle={t("vendors.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("vendors.page.actions.add")}
          </Button>
        )}
      />

      <AppPageGrid className="mt-5 md:grid-cols-4">
        <AppStatCard title={t("vendors.page.stats.totalVendors")} value={vendors.length} />
        <AppStatCard title={t("vendors.page.stats.totalCost")} value={formatCurrency(totals.total, currency, locale)} />
        <AppStatCard title={t("vendors.page.stats.deposits")} value={formatCurrency(totals.deposit, currency, locale)} />
        <AppStatCard title={t("vendors.page.stats.paid")} value={formatCurrency(totals.paid, currency, locale)} />
      </AppPageGrid>

      <div className="mt-5">
        <AppSectionCard title={t("vendors.page.table.title")} description={t("vendors.page.table.description")}>
          <AppDataTable
            columns={[
              { key: "name", label: t("vendors.page.table.columns.name") },
              { key: "contact", label: t("vendors.page.table.columns.contact") },
              { key: "events", label: t("vendors.page.table.columns.events") },
              { key: "payment", label: t("vendors.page.table.columns.payment"), align: "right" },
              { key: "status", label: t("vendors.page.table.columns.status") },
              { key: "actions", label: "", align: "right" },
            ]}
            rows={vendors.map((vendor) => ({
              id: vendor.id,
              name: vendor.name,
              contact: vendor.contactName || vendor.contactEmail || vendor.contactPhone || "-",
              events: vendor.vendorEvents.map((event) => event.event?.name).filter(Boolean).join(", ") || "-",
              payment: `${formatCurrency(vendor.amountPaidMinor, currency, locale)} / ${formatCurrency(vendor.totalCostMinor, currency, locale)}`,
              status: <AppStatusBadge label={t(`vendors.page.status.${vendor.paymentStatus}`)} variant={vendor.paymentStatus === "paid" ? "success" : vendor.paymentStatus === "partial" ? "secondary" : "default"} />,
              actions: (
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(vendor)} disabled={!canEdit} aria-label={t("vendors.page.actions.edit")}>
                    <Edit3 className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteVendorId(vendor.id)} disabled={!canEdit} aria-label={t("vendors.page.actions.delete")}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            }))}
            emptyLabel={t("vendors.page.empty")}
          />
        </AppSectionCard>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("vendors.page.dialog.editTitle") : t("vendors.page.dialog.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveVendor();
            }}
          >
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t("vendors.page.form.name")} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} placeholder={t("vendors.page.form.contactName")} />
              <Input value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder={t("vendors.page.form.contactEmail")} />
              <Input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder={t("vendors.page.form.contactPhone")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input value={form.totalCost} onChange={(event) => setForm((current) => ({ ...current, totalCost: event.target.value }))} placeholder={t("vendors.page.form.totalCost")} />
              <Input value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} placeholder={t("vendors.page.form.deposit")} />
              <Input value={form.paid} onChange={(event) => setForm((current) => ({ ...current, paid: event.target.value }))} placeholder={t("vendors.page.form.paid")} />
              <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <Select value={form.paymentStatus} onValueChange={(value) => setForm((current) => ({ ...current, paymentStatus: value as VendorPaymentStatus }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{t(`vendors.page.status.${status}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("vendors.page.form.notes")} />
            <div className="grid gap-2">
              <p className="text-sm font-medium text-zinc-900">{t("vendors.page.form.events")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm">
                    <Checkbox checked={form.eventIds.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} />
                    {event.name}
                  </label>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteVendorId !== null}
        onOpenChange={(open) => !open && setDeleteVendorId(null)}
        title={t("vendors.page.delete.title")}
        description={vendorPendingDelete ? t("vendors.page.delete.description", { name: vendorPendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteVendor}
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
