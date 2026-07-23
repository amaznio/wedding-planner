"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, MoreHorizontal, Plus, Trash2, WalletCards } from "lucide-react";
import { useParams } from "next/navigation";
import { AppDataTable } from "@/components/app/AppDataTable";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppStatusBadge } from "@/components/app/AppStatusBadge";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceManagementPageLoading } from "@/features/wedding-dashboard/components/WorkspacePageLoading";
import { CreateWeddingPaymentDialog } from "@/features/wedding-finances/components/CreateWeddingPaymentDialog";
import { CreateWeddingVendorDialog } from "@/features/wedding-vendors/components/CreateWeddingVendorDialog";
import { VendorAmountInput, VendorFormField } from "@/features/wedding-vendors/components/VendorFormField";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type VendorPaymentStatus = "not_started" | "partial" | "paid" | "canceled";
type VendorLifecycleStatus = "considering" | "booked" | "contract_signed" | "canceled";
const lifecycleStatuses: VendorLifecycleStatus[] = ["considering", "booked", "contract_signed", "canceled"];

type WeddingEvent = {
  id: string;
  name: string;
  type?: string | null;
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
  depositPaidMinor: number;
  amountPaidMinor: number;
  paymentStatus: VendorPaymentStatus;
  lifecycleStatus: VendorLifecycleStatus;
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
  lifecycleStatus: VendorLifecycleStatus;
  notes: string;
  eventIds: string[];
};

const emptyForm: VendorForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  totalCost: "",
  deposit: "",
  lifecycleStatus: "considering",
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentVendor, setPaymentVendor] = useState<Vendor | null>(null);
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
          if (vendor.lifecycleStatus === "canceled") return acc;
          acc.total += vendor.totalCostMinor;
          acc.deposit += vendor.depositPaidMinor;
          acc.paid += vendor.amountPaidMinor;
          return acc;
        },
        { total: 0, deposit: 0, paid: 0 },
      ),
    [vendors],
  );

  if (isLoading) {
    return (
      <WorkspaceManagementPageLoading
        title={t("vendors.page.title")}
        subtitle={t("vendors.page.subtitle")}
        primaryActionLabel={t("vendors.page.actions.add")}
        statsCount={4}
        showFilters={false}
      />
    );
  }

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setForm({
      name: vendor.name,
      contactName: vendor.contactName ?? "",
      contactEmail: vendor.contactEmail ?? "",
      contactPhone: vendor.contactPhone ?? "",
      totalCost: formatMajorAmount(vendor.totalCostMinor),
      deposit: formatMajorAmount(vendor.depositMinor),
      lifecycleStatus: vendor.lifecycleStatus,
      notes: vendor.notes ?? "",
      eventIds: vendor.vendorEvents.map((event) => event.eventId),
    });
    setEditingVendorId(vendor.id);
    setError(null);
    setDialogMode("edit");
  };

  const openPaymentDialog = (vendor: Vendor) => {
    setPaymentVendor(vendor);
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
    if (!form.name.trim() || totalCostMinor === null || depositMinor === null) {
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
        lifecycleStatus: form.lifecycleStatus,
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
      <WeddingPageHeader
        title={t("vendors.page.title")}
        subtitle={t("vendors.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("vendors.page.actions.add")}
          </Button>
        )}
      />

      {error && dialogMode === null ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <AppStatsRail
        className="mt-5"
        items={[
          { label: t("vendors.page.stats.totalVendors"), value: vendors.length },
          { label: t("vendors.page.stats.totalCost"), value: formatCurrency(totals.total, currency, locale) },
          { label: t("vendors.page.stats.deposits"), value: formatCurrency(totals.deposit, currency, locale) },
          { label: t("vendors.page.stats.paid"), value: formatCurrency(totals.paid, currency, locale) },
        ]}
      />

      <section className="mt-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">{t("vendors.page.table.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{t("vendors.page.table.description")}</p>
        </div>
          <AppDataTable
            variant="standalone"
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
              status: <AppStatusBadge label={t(`vendors.page.status.${vendor.lifecycleStatus}`)} variant={vendor.lifecycleStatus === "contract_signed" ? "success" : vendor.lifecycleStatus === "booked" ? "secondary" : "default"} />,
              actions: (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={() => openPaymentDialog(vendor)} disabled={!canEdit}>
                    <WalletCards className="size-4" />
                    {t("vendors.page.actions.addPayment")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" disabled={!canEdit} aria-label={t("vendors.page.actions.more")}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEditDialog(vendor)}>
                        <Edit3 className="mr-2 size-4" />
                        {t("vendors.page.actions.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeleteVendorId(vendor.id)} className="text-red-700 focus:text-red-700">
                        <Trash2 className="mr-2 size-4" />
                        {t("vendors.page.actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            }))}
            emptyLabel={t("vendors.page.empty")}
          />
      </section>

      <CreateWeddingVendorDialog
        weddingId={weddingId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={load}
        initialCurrency={currency}
      />

      {paymentVendor ? (
        <CreateWeddingPaymentDialog
          weddingId={weddingId}
          open={paymentVendor !== null}
          onOpenChange={(open) => {
            if (!open) setPaymentVendor(null);
          }}
          onCreated={load}
          initialCurrency={currency}
          initialEvents={events}
          initialVendor={{ id: paymentVendor.id, name: paymentVendor.name }}
        />
      ) : null}

      <Dialog open={dialogMode === "edit"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("vendors.page.dialog.editTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveVendor();
            }}
          >
            <VendorFormField label={t("vendors.page.form.name")}>
              <Input
                aria-label={t("vendors.page.form.name")}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("vendors.page.form.name")}
              />
            </VendorFormField>
            <div className="grid gap-3 sm:grid-cols-3">
              <VendorFormField label={t("vendors.page.form.contactName")}>
                <Input
                  aria-label={t("vendors.page.form.contactName")}
                  value={form.contactName}
                  onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                  placeholder={t("vendors.page.form.contactName")}
                />
              </VendorFormField>
              <VendorFormField label={t("vendors.page.form.contactEmail")}>
                <Input
                  aria-label={t("vendors.page.form.contactEmail")}
                  value={form.contactEmail}
                  onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                  placeholder={t("vendors.page.form.contactEmail")}
                />
              </VendorFormField>
              <VendorFormField label={t("vendors.page.form.contactPhone")}>
                <Input
                  aria-label={t("vendors.page.form.contactPhone")}
                  value={form.contactPhone}
                  onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  placeholder={t("vendors.page.form.contactPhone")}
                />
              </VendorFormField>
            </div>
            <div className={dialogMode === "create" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
              <VendorAmountInput
                label={t("vendors.page.form.totalCost")}
                value={form.totalCost}
                currency={currency}
                onChange={(value) => setForm((current) => ({ ...current, totalCost: value }))}
                placeholder={t("vendors.page.form.totalCost")}
              />
              {dialogMode === "create" ? (
                <VendorAmountInput
                  label={t("vendors.page.form.deposit")}
                  value={form.deposit}
                  currency={currency}
                  onChange={(value) => setForm((current) => ({ ...current, deposit: value }))}
                  placeholder={t("vendors.page.form.deposit")}
                />
              ) : null}
            </div>
            <VendorFormField label={t("vendors.page.form.status")}>
              <Select value={form.lifecycleStatus} onValueChange={(value) => setForm((current) => ({ ...current, lifecycleStatus: value as VendorLifecycleStatus }))}>
                <SelectTrigger aria-label={t("vendors.page.form.status")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lifecycleStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{t(`vendors.page.status.${status}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </VendorFormField>
            <VendorFormField label={t("vendors.page.form.notes")}>
              <Input
                aria-label={t("vendors.page.form.notes")}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder={t("vendors.page.form.notes")}
              />
            </VendorFormField>
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
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
