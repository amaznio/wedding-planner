"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";

type VendorLifecycleStatus = "considering" | "booked" | "contract_signed" | "canceled";
type WeddingEvent = { id: string; name: string };
type VendorForm = { name: string; contactName: string; contactEmail: string; contactPhone: string; totalCost: string; deposit: string; lifecycleStatus: VendorLifecycleStatus; notes: string; eventIds: string[] };

const lifecycleStatuses: VendorLifecycleStatus[] = ["considering", "booked", "contract_signed", "canceled"];
const emptyForm: VendorForm = { name: "", contactName: "", contactEmail: "", contactPhone: "", totalCost: "", deposit: "", lifecycleStatus: "considering", notes: "", eventIds: [] };

export function CreateWeddingVendorDialog({ weddingId, open, onOpenChange, onCreated }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }).then(async (response) => {
      if (response.ok) setEvents(((await response.json()) as { wedding: { events: WeddingEvent[] } }).wedding.events ?? []);
    });
  }, [open, weddingId]);

  const close = () => {
    setForm(emptyForm);
    setError(null);
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
          <Input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t("vendors.page.form.name")} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} placeholder={t("vendors.page.form.contactName")} />
            <Input value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder={t("vendors.page.form.contactEmail")} />
            <Input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder={t("vendors.page.form.contactPhone")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.totalCost} onChange={(event) => setForm((current) => ({ ...current, totalCost: event.target.value }))} placeholder={t("vendors.page.form.totalCost")} />
            <div className="grid gap-1"><Input value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} placeholder={t("vendors.page.form.deposit")} /><p className="text-xs text-zinc-500">{t("vendors.page.form.depositHint")}</p></div>
          </div>
          <div className="grid gap-2"><p className="text-sm font-medium text-zinc-900">{t("vendors.page.form.status")}</p><Select value={form.lifecycleStatus} onValueChange={(value) => setForm((current) => ({ ...current, lifecycleStatus: value as VendorLifecycleStatus }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{lifecycleStatuses.map((status) => <SelectItem key={status} value={status}>{t(`vendors.page.status.${status}`)}</SelectItem>)}</SelectContent></Select></div>
          <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("vendors.page.form.notes")} />
          <div className="grid gap-2"><p className="text-sm font-medium text-zinc-900">{t("vendors.page.form.events")}</p><div className="grid gap-2 sm:grid-cols-2">{events.map((event) => <label key={event.id} className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm"><Checkbox checked={form.eventIds.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} />{event.name}</label>)}</div></div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToMinor(value: string): number | null { const parsed = Number.parseFloat(value.trim().replace(",", ".")); return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null; }
