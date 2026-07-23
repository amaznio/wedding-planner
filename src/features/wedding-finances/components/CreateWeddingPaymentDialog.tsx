"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentAmountInput, PaymentDatePicker, PaymentFormField } from "@/features/wedding-finances/components/PaymentFormControls";
import { PaymentCategorySelect } from "@/features/wedding-finances/components/PaymentCategorySelect";
import {
  getPaidByLabel,
  paidByValues,
  getPaymentCategoryLabel,
} from "@/features/wedding-finances/lib/payment-options";
import { useI18n } from "@/i18n/provider";

type ExpenseStatus = "planned" | "committed" | "paid" | "reimbursed" | "canceled";
type LinkedEvent = { id: string; name: string; type?: string | null };
type LinkedItem = { id: string; name: string };
type PaymentForm = { category: string; amount: string; status: ExpenseStatus; incurredAt: string; paidBy: string; notes: string; vendorId: string; eventId: string };

const statuses: ExpenseStatus[] = ["planned", "committed", "paid", "reimbursed", "canceled"];
const emptyForm: PaymentForm = { category: "", amount: "", status: "planned", incurredAt: "", paidBy: "Couple", notes: "", vendorId: "", eventId: "" };

export function CreateWeddingPaymentDialog({ weddingId, open, onOpenChange, onCreated, initialCurrency, initialEvents = [], initialVendor }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
  initialCurrency?: string;
  initialEvents?: LinkedEvent[];
  initialVendor?: LinkedItem | null;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState<PaymentForm>(() => initialPaymentForm(initialEvents, initialVendor));
  const [currency, setCurrency] = useState(initialCurrency ?? "PLN");
  const [vendors, setVendors] = useState<LinkedItem[]>(initialVendor ? [initialVendor] : []);
  const [events, setEvents] = useState<LinkedEvent[]>(initialEvents);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      initialCurrency && initialEvents.length
        ? Promise.resolve(null)
        : fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
    ]).then(async ([weddingResponse, vendorsResponse]) => {
      if (weddingResponse?.ok) {
        const data = await weddingResponse.json() as { wedding: { currency: string; events: LinkedEvent[] } };
        const weddingEvents = data.wedding.events ?? [];
        setCurrency(data.wedding.currency ?? "PLN");
        setEvents(weddingEvents);
        setForm((current) => ({ ...current, eventId: current.eventId || getDefaultEventId(weddingEvents) }));
      }
      if (vendorsResponse.ok) {
        const fetchedVendors = ((await vendorsResponse.json()) as { vendors: LinkedItem[] }).vendors ?? [];
        setVendors(mergeInitialVendor(fetchedVendors, initialVendor));
      }
    });
  }, [initialCurrency, initialEvents, initialVendor, open, weddingId]);

  const close = () => {
    setForm(initialPaymentForm(initialEvents, initialVendor));
    setError(null);
    onOpenChange(false);
  };

  const save = async () => {
    const amountMinor = parseAmountToMinor(form.amount);
    if (!form.category.trim() || amountMinor === null) {
      setError(t("budget.page.errors.invalidForm"));
      return;
    }
    const title = getDerivedPaymentTitle(form, vendors, t);
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: form.category.trim(),
          amountMinor,
          currency,
          status: form.status,
          incurredAt: form.incurredAt ? new Date(`${form.incurredAt}T00:00:00`).toISOString() : undefined,
          paidBy: form.paidBy.trim() || undefined,
          notes: form.notes.trim() || undefined,
          vendorId: form.vendorId || null,
          eventId: form.eventId || null,
        }),
      });
      if (!response.ok) throw new Error(t("budget.page.errors.save"));
      await onCreated?.();
      close();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("budget.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent className="sm:max-w-xl" closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("budget.page.dialog.createTitle")}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <Choice fieldLabel={t("budget.page.form.vendorOptional")} value={form.vendorId || "none"} options={["none", ...vendors.map((item) => item.id)]} placeholder={t("budget.page.form.vendorOptional")} renderLabel={(value) => value === "none" ? t("budget.page.form.noVendor") : vendors.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, vendorId: value === "none" ? "" : value }))} />
          <PaymentCategorySelect fieldLabel={t("budget.page.form.category")} value={form.category} placeholder={t("budget.page.form.category")} onChange={(value) => setForm((current) => ({ ...current, category: value }))} t={t} />
          <Choice fieldLabel={t("budget.page.form.status")} value={form.status} options={statuses} placeholder={t("budget.page.form.status")} renderLabel={(value) => t(`budget.page.status.${value}`)} onChange={(value) => setForm((current) => ({ ...current, status: value as ExpenseStatus }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentAmountInput label={t("budget.page.form.amount")} value={form.amount} currency={currency} placeholder={t("budget.page.form.amount")} onChange={(value) => setForm((current) => ({ ...current, amount: value }))} />
            <PaymentDatePicker label={t("budget.page.form.date")} value={form.incurredAt} locale={locale} placeholder={t("budget.page.form.datePlaceholder")} clearLabel={t("budget.page.form.clearDate")} onChange={(value) => setForm((current) => ({ ...current, incurredAt: value }))} />
          </div>
          <Choice fieldLabel={t("budget.page.form.event")} value={form.eventId || "none"} options={["none", ...events.map((item) => item.id)]} placeholder={t("budget.page.form.event")} renderLabel={(value) => value === "none" ? t("budget.page.form.noEvent") : events.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, eventId: value === "none" ? "" : value }))} />
          <Choice fieldLabel={t("budget.page.form.paidBy")} value={form.paidBy || "none"} options={["none", ...paidByValues]} placeholder={t("budget.page.form.paidBy")} renderLabel={(value) => value === "none" ? t("budget.page.form.noPaidBy") : getPaidByLabel(value, t)} onChange={(value) => setForm((current) => ({ ...current, paidBy: value === "none" ? "" : value }))} />
          <PaymentFormField label={t("budget.page.form.notes")}>
            <Textarea aria-label={t("budget.page.form.notes")} className="min-h-28 resize-y" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("budget.page.form.notes")} />
          </PaymentFormField>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Choice({
  fieldLabel,
  value,
  options,
  placeholder,
  renderLabel,
  onChange,
}: {
  fieldLabel: string;
  value: string;
  options: string[];
  placeholder: string;
  renderLabel: (value: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <PaymentFormField label={fieldLabel}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={fieldLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{renderLabel(option)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PaymentFormField>
  );
}
function initialPaymentForm(events: LinkedEvent[] = [], vendor?: LinkedItem | null): PaymentForm {
  return { ...emptyForm, eventId: getDefaultEventId(events), incurredAt: toDateInputValue(new Date()), vendorId: vendor?.id ?? "" };
}
function getDefaultEventId(events: LinkedEvent[]): string {
  return events.find((event) => event.type === "wedding")?.id ?? events[0]?.id ?? "";
}
function mergeInitialVendor(vendors: LinkedItem[], initialVendor?: LinkedItem | null): LinkedItem[] {
  if (!initialVendor || vendors.some((vendor) => vendor.id === initialVendor.id)) return vendors;
  return [initialVendor, ...vendors];
}
function getDerivedPaymentTitle(form: PaymentForm, vendors: LinkedItem[], t: (key: string) => string): string {
  const vendorName = vendors.find((vendor) => vendor.id === form.vendorId)?.name;
  return vendorName ?? getPaymentCategoryLabel(form.category, t);
}
function parseAmountToMinor(value: string): number | null { const parsed = Number.parseFloat(value.trim().replace(",", ".")); return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null; }
function toDateInputValue(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
