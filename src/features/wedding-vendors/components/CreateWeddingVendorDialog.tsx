"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";
import { defaultVendorType, type VendorType } from "@/features/wedding-vendors/lib/vendor-options";
import { getDefaultVenuePricingEventId, getVenuePricingGuestCount } from "@/features/wedding-vendors/lib/venue-pricing";
import { VendorAmountInput, VendorFormField } from "./VendorFormField";
import { VendorTypeSelect } from "./VendorTypeSelect";
import { VendorVenuePricingFields } from "./VendorVenuePricingFields";

type VendorLifecycleStatus = "considering" | "booked" | "contract_signed" | "canceled";
type WeddingEvent = { id: string; name: string; type?: string | null; _count?: { eventGuests?: number } };
type VendorForm = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  vendorType: VendorType;
  totalCost: string;
  deposit: string;
  venuePricePerPerson: string;
  venueGuestCount: string;
  venuePricingEventId: string;
  lifecycleStatus: VendorLifecycleStatus;
  notes: string;
  eventIds: string[];
};

const lifecycleStatuses: VendorLifecycleStatus[] = ["considering", "booked", "contract_signed", "canceled"];
const emptyForm: VendorForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  vendorType: defaultVendorType,
  totalCost: "",
  deposit: "",
  venuePricePerPerson: "",
  venueGuestCount: "",
  venuePricingEventId: "",
  lifecycleStatus: "considering",
  notes: "",
  eventIds: [],
};

export function CreateWeddingVendorDialog({ weddingId, open, onOpenChange, onCreated, initialCurrency = "PLN" }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
  initialCurrency?: string;
}) {
  const { t, locale } = useI18n();
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
      const nextEvents = data.wedding.events ?? [];
      setEvents(nextEvents);
      setForm((current) => (
        current.vendorType === "Venue" && !current.venuePricingEventId
          ? applyVenueDefaults(current, nextEvents)
          : current
      ));
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
    const venuePricePerPersonMinor = form.venuePricePerPerson.trim()
      ? parseAmountToMinor(form.venuePricePerPerson)
      : null;
    const venueGuestCount = form.venueGuestCount.trim()
      ? parseGuestCount(form.venueGuestCount)
      : null;
    const hasInvalidVenuePricing = form.vendorType === "Venue"
      && ((form.venuePricePerPerson.trim() && venuePricePerPersonMinor === null)
        || (form.venueGuestCount.trim() && venueGuestCount === null));
    if (!form.name.trim() || totalCostMinor === null || depositMinor === null || hasInvalidVenuePricing) {
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
          vendorType: form.vendorType,
          totalCostMinor,
          depositMinor,
          venuePricePerPersonMinor: form.vendorType === "Venue" ? venuePricePerPersonMinor : null,
          venueGuestCount: form.vendorType === "Venue" ? venueGuestCount : null,
          venuePricingEventId: form.vendorType === "Venue" ? form.venuePricingEventId || null : null,
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
          <VendorTypeSelect
            value={form.vendorType}
            onChange={(vendorType) => setForm((current) => (
              vendorType === "Venue"
                ? applyVenueDefaults({ ...current, vendorType }, events)
                : { ...current, vendorType }
            ))}
          />
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
          {form.vendorType === "Venue" ? (
            <VendorVenuePricingFields
              events={events}
              currency={currency}
              locale={locale}
              eventId={form.venuePricingEventId}
              pricePerPerson={form.venuePricePerPerson}
              guestCount={form.venueGuestCount}
              onEventChange={(eventId, guestCount) => setForm((current) => ({
                ...current,
                venuePricingEventId: eventId,
                venueGuestCount: String(guestCount),
                eventIds: current.eventIds.includes(eventId) ? current.eventIds : [...current.eventIds, eventId],
              }))}
              onPricePerPersonChange={(value) => setForm((current) => ({ ...current, venuePricePerPerson: value }))}
              onGuestCountChange={(value) => setForm((current) => ({ ...current, venueGuestCount: value }))}
              onUseAsTotal={(amountMinor) => setForm((current) => ({ ...current, totalCost: formatMajorAmount(amountMinor) }))}
            />
          ) : null}
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

function parseGuestCount(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function formatMajorAmount(amountMinor: number): string {
  return String(amountMinor / 100);
}

function applyVenueDefaults(form: VendorForm, events: WeddingEvent[]): VendorForm {
  const eventId = form.venuePricingEventId || getDefaultVenuePricingEventId(events);
  if (!eventId) return form;

  return {
    ...form,
    venuePricingEventId: eventId,
    venueGuestCount: form.venueGuestCount || String(getVenuePricingGuestCount(events, eventId)),
    eventIds: form.eventIds.includes(eventId) ? form.eventIds : [...form.eventIds, eventId],
  };
}
