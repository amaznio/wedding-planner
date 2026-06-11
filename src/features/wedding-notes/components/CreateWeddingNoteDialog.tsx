"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NoteCategoryCombobox } from "@/features/wedding-notes/components/NoteCategoryCombobox";
import { useI18n } from "@/i18n/provider";

type NoteForm = { title: string; body: string; category: string; pinned: boolean };
const emptyForm: NoteForm = { title: "", body: "", category: "", pinned: false };

export function CreateWeddingNoteDialog({ weddingId, open, onOpenChange, onCreated }: {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<NoteForm>(emptyForm);
  const [categories, setCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetch(`/api/weddings/${weddingId}/notes`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ categories: string[] }> : null)
      .then((data) => setCategories(data?.categories ?? []));
  }, [open, weddingId]);

  const close = () => {
    setForm(emptyForm);
    setError(null);
    onOpenChange(false);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError(t("notes.page.errors.invalidForm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/weddings/${weddingId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category.trim() || null,
          pinned: form.pinned,
        }),
      });
      if (!response.ok) throw new Error(t("notes.page.errors.save"));
      await onCreated?.();
      close();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("notes.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" closeLabel={t("common.close")}>
        <DialogHeader className="border-b border-zinc-200 px-6 py-5 pr-12">
          <DialogTitle className="text-xl">{t("notes.page.dialog.createTitle")}</DialogTitle>
          <DialogDescription>{t("notes.page.dialog.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="grid gap-5 px-6 py-5">
            <Field label={t("notes.page.form.title")}><Input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("notes.page.form.titlePlaceholder")} /></Field>
            <Field label={t("notes.page.form.category")}>
              <NoteCategoryCombobox id="create-note-category" categories={categories} value={form.category} placeholder={t("notes.page.form.categoryPlaceholder")} emptyLabel={t("notes.page.form.categoryEmpty")} createLabel={(category) => t("notes.page.form.categoryCreate", { category })} onValueChange={(category) => setForm((current) => ({ ...current, category }))} />
            </Field>
            <Field label={t("notes.page.form.body")}><textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder={t("notes.page.form.bodyPlaceholder")} className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300" /></Field>
            <label className="flex cursor-pointer items-start gap-3"><Checkbox className="mt-0.5" checked={form.pinned} onCheckedChange={(checked) => setForm((current) => ({ ...current, pinned: checked === true }))} /><span className="grid gap-0.5"><span className="text-sm font-medium text-zinc-900">{t("notes.page.form.pinned")}</span><span className="text-xs leading-5 text-zinc-500">{t("notes.page.form.pinnedDescription")}</span></span></label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4"><Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><label className="text-sm font-medium text-zinc-900">{label}</label>{children}</div>;
}
