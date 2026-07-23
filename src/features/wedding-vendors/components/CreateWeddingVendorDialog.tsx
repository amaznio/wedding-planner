"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import { VendorAmountInput, VendorFormField } from "./VendorFormField";

type VendorLifecycleStatus = "considering" | "booked" | "contract_signed" | "canceled";
type WeddingEvent = { id: string; name: string };
type VendorForm = { name: string; contactName: string; contactEmail: string; contactPhone: string; totalCost: string; deposit: string; lifecycleStatus: VendorLifecycleStatus; notes: string; eventIds: string[] };

const lifecycleStatuses: VendorLifecycleStatus[] = ["considering", "booked", "contract_signed", "canceled"];
const emptyForm: VendorForm = { name: "", contactName: "", contactEmail: "", contactPhone: "", totalCost: "", deposit: "", lifecycleStatus: "considering", notes: "", eventIds: [] };

export function CreateWeddingVendorDialog({ weddingId, open, onOpenChange, onCreated, initialCurrency = "PLN" }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
  initialCurrency?: string;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [fetchedCurrency, setFetchedCurrency] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = fetchedCurrency ?? initialCurrency;

  useEffect(() => {
    if (!open) return;
    void fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = (await response.json()) as { wedding: { currency?: string | null; events: WeddingEvent[] } };
      setEvents(data.wedding.events ?? []);
      setFetchedCurrency(data.wedding.currency ?? null);
    });
  }, [open, weddingId]);

  const close = () => {
    setForm(emptyForm);
    setError(null);
    setFetchedCurrency(null);
    onOpenChange(false);
  };
  const toggleEvent = (eventId: string) => setForm((current) => ({ ...current, eventIds: current.eventIds.includes(eventId) ? current.eventIds.filter((id) => id !== eventId) : [...current.eventIds, eventId] }));
  const save = async () => {
    const totalCostMinor = parseAmountToMinor(form.totalCost);
    const depositMinor = parseAmountToMinor(form.deposit || "0");
    if (!form.name.trim() || totalCostMinor === null || depositMinor === null) {
      setError(t("vendors.page.errors.invalidForm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactName: form.contactName.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          notes: form.notes.trim() || undefined,
          totalCostMinor,
          depositMinor,
          lifecycleStatus: form.lifecycleStatus,
          eventIds: form.eventIds,
        }),
      });
      if (!response.ok) throw new Error(t("vendors.page.errors.save"));
      await onCreated?.();
      close();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("vendors.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent className="sm:max-w-2xl" closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("vendors.page.dialog.createTitle")}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <VendorFormField label={t("vendors.page.form.name")}>
            <Input
              aria-label={t("vendors.page.form.name")}
              autoFocus
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
          <div className="grid gap-3 sm:grid-cols-2">
            <VendorAmountInput
              label={t("vendors.page.form.totalCost")}
              value={form.totalCost}
              currency={currency}
              onChange={(value) => setForm((current) => ({ ...current, totalCost: value }))}
              placeholder={t("vendors.page.form.totalCost")}
            />
            <VendorAmountInput
              label={t("vendors.page.form.deposit")}
              value={form.deposit}
              currency={currency}
              onChange={(value) => setForm((current) => ({ ...current, deposit: value }))}
              placeholder={t("vendors.page.form.deposit")}
            />
          </div>
          <VendorFormField label={t("vendors.page.form.status")}>
            <Select value={form.lifecycleStatus} onValueChange={(value) => setForm((current) => ({ ...current, lifecycleStatus: value as VendorLifecycleStatus }))}>
              <SelectTrigger aria-label={t("vendors.page.form.status")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{lifecycleStatuses.map((status) => <SelectItem key={status} value={status}>{t(`vendors.page.status.${status}`)}</SelectItem>)}</SelectContent>
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
          <div className="grid gap-2"><p className="text-sm font-medium text-zinc-900">{t("vendors.page.form.events")}</p><div className="grid gap-2 sm:grid-cols-2">{events.map((event) => <label key={event.id} className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm"><Checkbox checked={form.eventIds.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} />{event.name}</label>)}</div></div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToMinor(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
