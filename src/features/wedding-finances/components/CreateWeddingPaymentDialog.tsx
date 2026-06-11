"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/provider";

type ExpenseStatus = "planned" | "committed" | "paid" | "reimbursed" | "canceled";
type LinkedItem = { id: string; name: string };
type PaymentForm = { title: string; category: string; amount: string; status: ExpenseStatus; incurredAt: string; paidBy: string; notes: string; vendorId: string; eventId: string };

const statuses: ExpenseStatus[] = ["planned", "committed", "paid", "reimbursed", "canceled"];
const emptyForm: PaymentForm = { title: "", category: "", amount: "", status: "planned", incurredAt: "", paidBy: "", notes: "", vendorId: "", eventId: "" };

export function CreateWeddingPaymentDialog({ weddingId, open, onOpenChange, onCreated }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<PaymentForm>(initialPaymentForm);
  const [currency, setCurrency] = useState("PLN");
  const [vendors, setVendors] = useState<LinkedItem[]>([]);
  const [events, setEvents] = useState<LinkedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
    ]).then(async ([weddingResponse, vendorsResponse]) => {
      if (weddingResponse.ok) {
        const data = await weddingResponse.json() as { wedding: { currency: string; events: LinkedItem[] } };
        setCurrency(data.wedding.currency ?? "PLN");
        setEvents(data.wedding.events ?? []);
      }
      if (vendorsResponse.ok) setVendors(((await vendorsResponse.json()) as { vendors: LinkedItem[] }).vendors ?? []);
    });
  }, [open, weddingId]);

  const close = () => {
    setForm(initialPaymentForm());
    setError(null);
    onOpenChange(false);
  };

  const save = async () => {
    const amountMinor = parseAmountToMinor(form.amount);
    if (!form.title.trim() || !form.category.trim() || amountMinor === null) {
      setError(t("budget.page.errors.invalidForm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
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
          <Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("budget.page.form.title")} />
          <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder={t("budget.page.form.category")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder={t("budget.page.form.amount")} />
            <Input type="date" value={form.incurredAt} onChange={(event) => setForm((current) => ({ ...current, incurredAt: event.target.value }))} />
          </div>
          <Choice value={form.status} options={statuses} label={(value) => t(`budget.page.status.${value}`)} onChange={(value) => setForm((current) => ({ ...current, status: value as ExpenseStatus }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice value={form.vendorId || "none"} options={["none", ...vendors.map((item) => item.id)]} label={(value) => value === "none" ? t("budget.page.form.noVendor") : vendors.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, vendorId: value === "none" ? "" : value }))} />
            <Choice value={form.eventId || "none"} options={["none", ...events.map((item) => item.id)]} label={(value) => value === "none" ? t("budget.page.form.noEvent") : events.find((item) => item.id === value)?.name ?? value} onChange={(value) => setForm((current) => ({ ...current, eventId: value === "none" ? "" : value }))} />
          </div>
          <Input value={form.paidBy} onChange={(event) => setForm((current) => ({ ...current, paidBy: event.target.value }))} placeholder={t("budget.page.form.paidBy")} />
          <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("budget.page.form.notes")} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ value, options, label, onChange }: { value: string; options: string[]; label: (value: string) => string; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{label(option)}</SelectItem>)}</SelectContent></Select>;
}
function initialPaymentForm(): PaymentForm { return { ...emptyForm, incurredAt: toDateInputValue(new Date()) }; }
function parseAmountToMinor(value: string): number | null { const parsed = Number.parseFloat(value.trim().replace(",", ".")); return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null; }
function toDateInputValue(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
