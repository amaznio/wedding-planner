"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Plus, Trash2 } from "lucide-react";
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
import { WorkspaceRouteLoading } from "@/features/wedding-dashboard/components/WorkspaceRouteLoading";
import { WeddingPageHeader } from "@/features/wedding-shell/components/WeddingPageHeader";
import { useI18n } from "@/i18n/provider";

type DocumentStatus = "draft" | "shared" | "signed";

type LinkedItem = {
  id: string;
  name: string;
};

type WeddingDocument = {
  id: string;
  name: string;
  category: string;
  ownerName: string | null;
  status: DocumentStatus;
  externalUrl: string | null;
  notes: string | null;
  dueDate: string | null;
  eventId: string | null;
  vendorId: string | null;
  event: LinkedItem | null;
  vendor: LinkedItem | null;
};

type WeddingResponse = {
  access: { canEdit: boolean };
  wedding: {
    events: LinkedItem[];
  };
};

type VendorsResponse = {
  vendors: LinkedItem[];
};

type DocumentForm = {
  name: string;
  category: string;
  ownerName: string;
  status: DocumentStatus;
  externalUrl: string;
  notes: string;
  dueDate: string;
  eventId: string;
  vendorId: string;
};

const statuses: Array<DocumentStatus | "all"> = ["all", "draft", "shared", "signed"];
const noLinkValue = "__none__";

const emptyForm: DocumentForm = {
  name: "",
  category: "",
  ownerName: "",
  status: "draft",
  externalUrl: "",
  notes: "",
  dueDate: "",
  eventId: noLinkValue,
  vendorId: noLinkValue,
};

export function WeddingDocumentsPage() {
  const { t } = useI18n();
  const params = useParams<{ weddingId: string }>();
  const weddingId = params.weddingId;
  const [documents, setDocuments] = useState<WeddingDocument[]>([]);
  const [events, setEvents] = useState<LinkedItem[]>([]);
  const [vendors, setVendors] = useState<LinkedItem[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentForm>(emptyForm);

  const load = useCallback(async () => {
    const [documentsResponse, weddingResponse, vendorsResponse] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/documents`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}`, { cache: "no-store" }),
      fetch(`/api/weddings/${weddingId}/vendors`, { cache: "no-store" }),
    ]);
    if (!documentsResponse.ok) throw new Error(t("documents.page.errors.load"));

    const documentsData = (await documentsResponse.json()) as { documents: WeddingDocument[] };
    setDocuments(documentsData.documents ?? []);

    if (weddingResponse.ok) {
      const weddingData = (await weddingResponse.json()) as WeddingResponse;
      setCanEdit(weddingData.access?.canEdit ?? false);
      setEvents(weddingData.wedding.events ?? []);
    }

    if (vendorsResponse.ok) {
      const vendorsData = (await vendorsResponse.json()) as VendorsResponse;
      setVendors(vendorsData.vendors ?? []);
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
        if (active) setError(loadError instanceof Error ? loadError.message : t("documents.page.errors.load"));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [load, t]);

  const visibleDocuments = useMemo(
    () => documents.filter((document) => statusFilter === "all" || document.status === statusFilter),
    [documents, statusFilter],
  );

  if (isLoading) {
    return <WorkspaceRouteLoading />;
  }

  const openCreateDialog = () => {
    setForm(emptyForm);
    setEditingDocumentId(null);
    setError(null);
    setDialogMode("create");
  };

  const openEditDialog = (document: WeddingDocument) => {
    setForm({
      name: document.name,
      category: document.category,
      ownerName: document.ownerName ?? "",
      status: document.status,
      externalUrl: document.externalUrl ?? "",
      notes: document.notes ?? "",
      dueDate: document.dueDate ? document.dueDate.slice(0, 10) : "",
      eventId: document.eventId ?? noLinkValue,
      vendorId: document.vendorId ?? noLinkValue,
    });
    setEditingDocumentId(document.id);
    setError(null);
    setDialogMode("edit");
  };

  const saveDocument = async () => {
    if (!canEdit || !dialogMode) return;
    if (!form.name.trim() || !form.category.trim()) {
      setError(t("documents.page.errors.invalidForm"));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        ownerName: form.ownerName.trim() || null,
        status: form.status,
        externalUrl: form.externalUrl.trim() || null,
        notes: form.notes.trim() || null,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
        eventId: form.eventId === noLinkValue ? null : form.eventId,
        vendorId: form.vendorId === noLinkValue ? null : form.vendorId,
      };
      const url = dialogMode === "edit" && editingDocumentId
        ? `/api/weddings/${weddingId}/documents/${editingDocumentId}`
        : `/api/weddings/${weddingId}/documents`;
      const response = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(t("documents.page.errors.save"));
      await load();
      setDialogMode(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("documents.page.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!canEdit || !deleteDocumentId) return;
    const response = await fetch(`/api/weddings/${weddingId}/documents/${deleteDocumentId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(t("documents.page.errors.delete"));
    await load();
    setDeleteDocumentId(null);
  };

  const documentPendingDelete = documents.find((document) => document.id === deleteDocumentId) ?? null;

  return (
    <AppWorkspacePage>
      <WeddingPageHeader
        title={t("documents.page.title")}
        subtitle={t("documents.page.subtitle")}
        actions={(
          <Button type="button" variant="primary" onClick={openCreateDialog} disabled={!canEdit}>
            <Plus className="size-4" />
            {t("documents.page.actions.add")}
          </Button>
        )}
      />

      <AppStatsRail
        className="mt-5 max-w-xl"
        items={[
          { label: t("documents.page.stats.total"), value: documents.length },
          { label: t("documents.page.stats.shared"), value: documents.filter((document) => document.status === "shared").length },
          { label: t("documents.page.stats.signed"), value: documents.filter((document) => document.status === "signed").length },
        ]}
      />

      <section className="mt-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{t("documents.page.table.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{t("documents.page.table.description")}</p>
        </div>
        <div className="mt-4 max-w-xs">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status === "all" ? t("documents.page.filters.all") : t(`documents.page.status.${status}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <div className="mt-4">
          <AppDataTable
            variant="standalone"
            columns={[
              { key: "name", label: t("documents.page.table.columns.name") },
              { key: "category", label: t("documents.page.table.columns.category") },
              { key: "owner", label: t("documents.page.table.columns.owner") },
              { key: "linked", label: t("documents.page.table.columns.linked") },
              { key: "status", label: t("documents.page.table.columns.status") },
              { key: "actions", label: "", align: "right" },
            ]}
            rows={visibleDocuments.map((document) => ({
              id: document.id,
              name: document.name,
              category: document.category,
              owner: document.ownerName ?? "-",
              linked: document.vendor?.name ?? document.event?.name ?? "-",
              status: <AppStatusBadge label={t(`documents.page.status.${document.status}`)} variant={document.status === "signed" ? "success" : document.status === "shared" ? "secondary" : "default"} />,
              actions: (
                <div className="flex justify-end gap-1">
                  {document.externalUrl ? (
                    <Button type="button" variant="ghost" size="icon" onClick={() => window.open(document.externalUrl ?? "", "_blank", "noopener,noreferrer")} aria-label={t("documents.page.actions.open")}>
                      <ExternalLink className="size-4" />
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEditDialog(document)} disabled={!canEdit} aria-label={t("documents.page.actions.edit")}>
                    <Edit3 className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteDocumentId(document.id)} disabled={!canEdit} aria-label={t("documents.page.actions.delete")}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            }))}
            emptyLabel={t("documents.page.empty")}
          />
        </div>
      </section>

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("documents.page.dialog.editTitle") : t("documents.page.dialog.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDocument();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t("documents.page.form.name")} />
              <Input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder={t("documents.page.form.category")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} placeholder={t("documents.page.form.owner")} />
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as DocumentStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("documents.page.status.draft")}</SelectItem>
                  <SelectItem value="shared">{t("documents.page.status.shared")}</SelectItem>
                  <SelectItem value="signed">{t("documents.page.status.signed")}</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={form.eventId} onValueChange={(value) => setForm((current) => ({ ...current, eventId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noLinkValue}>{t("documents.page.form.noEvent")}</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.vendorId} onValueChange={(value) => setForm((current) => ({ ...current, vendorId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noLinkValue}>{t("documents.page.form.noVendor")}</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={form.externalUrl} onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))} placeholder={t("documents.page.form.externalUrl")} />
            <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t("documents.page.form.notes")} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDocumentId !== null}
        onOpenChange={(open) => !open && setDeleteDocumentId(null)}
        title={t("documents.page.delete.title")}
        description={documentPendingDelete ? t("documents.page.delete.description", { name: documentPendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={deleteDocument}
      />
    </AppWorkspacePage>
  );
}
