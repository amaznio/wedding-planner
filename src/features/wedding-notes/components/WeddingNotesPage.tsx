"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit3, Plus, Search, Star, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { AppPageGrid } from "@/components/app/AppPageGrid";
import { AppSectionCard } from "@/components/app/AppSectionCard";
import { AppStatsRail } from "@/components/app/AppStatsRail";
import { AppWorkspacePage } from "@/components/app/AppWorkspacePage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { NoteCategoryCombobox } from "@/features/wedding-notes/components/NoteCategoryCombobox";
import { CreateWeddingNoteDialog } from "@/features/wedding-notes/components/CreateWeddingNoteDialog";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type WeddingNote = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  pinned: boolean;
  updatedAt: string;
};

type WeddingResponse = {
  access: { canEdit: boolean };
};

type NoteForm = {
  title: string;
  body: string;
  category: string;
  pinned: boolean;
};

const emptyForm: NoteForm = {
  title: "",
  body: "",
  category: "",
  pinned: false,
};

export function WeddingNotesPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [notes, setNotes] = useState<WeddingNote[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"edit" | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState<NoteForm>(emptyForm);

  const load = useCallback(async () => {
    const [notesResponse, weddingResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/notes`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
    ]);
    if (!notesResponse.ok) throw new Error(t("notes.page.errors.load"));
    const notesData = (await notesResponse.json()) as { notes: WeddingNote[]; categories: string[] };
    setNotes(notesData.notes ?? []);
    setCategories(notesData.categories ?? []);

    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
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
        if (active) setError(loadError instanceof Error ? loadError.message : t("notes.page.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load, t]);

  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notes;
    return notes.filter((note) => `${note.title} ${note.body} ${note.category ?? ""}`.toLowerCase().includes(normalized));
  }, [notes, query]);

  if (isLoading) {
    return <WorkspaceRouteLoading />;
  }

  const openCreateDialog = () => {
    setCreateOpen(true);
  };

  const openEditDialog = (note: WeddingNote) => {
    setForm({
      title: note.title,
      body: note.body,
      category: note.category ?? "",
      pinned: note.pinned,
    });
    setEditingNoteId(note.id);
    setError(null);
    setDialogMode("edit");
  };

  const saveNote = async () => {
    if (!canEdit || !dialogMode) return;
    if (!form.title.trim() || !form.body.trim()) {
      setError(t("notes.page.errors.invalidForm"));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category.trim() || null,
        pinned: form.pinned,
      };
      const url = dialogMode === "edit" && editingNoteId
        ? `/api/weddings/${weddingId}/notes/${editingNoteId}`
        : `/api/weddings/${weddingId}/notes`;
      const response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("notes.page.errors.save"));
      await load();
      setDialogMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("notes.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!canEdit || !deleteNoteId) return;
    const response = await fetch(`/api/weddings/${weddingId}/notes/${deleteNoteId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("notes.page.errors.delete"));
    await load();
    setDeleteNoteId(null);
  };

  const notePendingDelete = notes.find((note) => note.id === deleteNoteId) ?? null;

  return (
    <AppWorkspacePage>
      <WeddingPageHeader
        title={t("notes.page.title")}
        subtitle={t("notes.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("notes.page.actions.add")}
          </Button>
        )}
      />
      <AppStatsRail
        className="mt-5 max-w-xl"
        items={[
          { label: t("notes.page.stats.total"), value: notes.length },
          { label: t("notes.page.stats.pinned"), value: notes.filter((note) => note.pinned).length },
          { label: t("notes.page.stats.categories"), value: categories.length },
        ]}
      />

      <InputGroup className="mt-5 max-w-md">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("notes.page.search")} />
      </InputGroup>

      <AppPageGrid className="mt-5 md:grid-cols-2">
        {visibleNotes.map((note) => {
          const isExpanded = expandedNoteIds.has(note.id);
          const canExpand = shouldClampNoteBody(note.body);

          return (
            <AppSectionCard key={note.id} title={note.title} description={`${note.category ?? t("notes.page.uncategorized")} • ${formatDate(note.updatedAt, locale)}`}>
              <div className="flex min-h-28 flex-col">
                <p id={`note-body-${note.id}`} className={`whitespace-pre-wrap break-words text-sm text-zinc-700 ${isExpanded ? "" : "line-clamp-4"}`}>{note.body}</p>
                {canExpand ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-auto w-fit px-0 py-1 text-zinc-600 hover:bg-transparent hover:text-zinc-900"
                    aria-expanded={isExpanded}
                    aria-controls={`note-body-${note.id}`}
                    onClick={() => setExpandedNoteIds((current) => {
                      const next = new Set(current);
                      if (next.has(note.id)) next.delete(note.id);
                      else next.add(note.id);
                      return next;
                    })}
                  >
                    {isExpanded ? t("notes.page.actions.showLess") : t("notes.page.actions.showMore")}
                    {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </Button>
                ) : null}
                <div className="mt-auto flex items-center justify-between pt-4">
                  {note.pinned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <Star className="size-3 fill-current" />
                      {t("notes.page.pinned")}
                    </span>
                  ) : <span />}
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(note)} disabled={!canEdit} aria-label={t("notes.page.actions.edit")}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteNoteId(note.id)} disabled={!canEdit} aria-label={t("notes.page.actions.delete")}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </AppSectionCard>
          );
        })}
      </AppPageGrid>
      {!visibleNotes.length ? <p className="mt-5 text-sm text-zinc-600">{t("notes.page.empty")}</p> : null}

      <CreateWeddingNoteDialog weddingId={weddingId} open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl" closeLabel={t("common.close")}>
          <DialogHeader className="border-b border-zinc-200 px-6 py-5 pr-12">
            <DialogTitle className="text-xl">
              {t("notes.page.dialog.editTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("notes.page.dialog.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveNote();
            }}
          >
            <div className="grid gap-5 px-6 py-5">
              <div className="grid gap-2">
                <label htmlFor="note-title" className="text-sm font-medium text-zinc-900">{t("notes.page.form.title")}</label>
                <Input
                  id="note-title"
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder={t("notes.page.form.titlePlaceholder")}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="note-category" className="text-sm font-medium text-zinc-900">{t("notes.page.form.category")}</label>
                  <span className="text-xs text-zinc-500">{t("notes.page.form.optional")}</span>
                </div>
                <NoteCategoryCombobox
                  key={`${dialogMode}-${editingNoteId ?? "new"}`}
                  id="note-category"
                  categories={categories}
                  value={form.category}
                  placeholder={t("notes.page.form.categoryPlaceholder")}
                  emptyLabel={t("notes.page.form.categoryEmpty")}
                  createLabel={(category) => t("notes.page.form.categoryCreate", { category })}
                  onValueChange={(category) => setForm((current) => ({ ...current, category }))}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="note-body" className="text-sm font-medium text-zinc-900">{t("notes.page.form.body")}</label>
                <textarea
                  id="note-body"
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder={t("notes.page.form.bodyPlaceholder")}
                  className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300"
                />
              </div>

              <label htmlFor="note-pinned" className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  id="note-pinned"
                  className="mt-0.5"
                  checked={form.pinned}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, pinned: checked === true }))}
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium text-zinc-900">{t("notes.page.form.pinned")}</span>
                  <span className="text-xs leading-5 text-zinc-500">{t("notes.page.form.pinnedDescription")}</span>
                </span>
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <DialogFooter className="border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title={t("notes.page.delete.title")}
        description={notePendingDelete ? t("notes.page.delete.description", { title: notePendingDelete.title }) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={deleteNote}
      />
    </AppWorkspacePage>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

function shouldClampNoteBody(body: string): boolean {
  return body.split(/\r?\n/).length > 4 || body.length > 180;
}
