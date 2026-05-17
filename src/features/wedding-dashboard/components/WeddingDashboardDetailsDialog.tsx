"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/provider";

type WeddingDashboardDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingForm: {
    name: string;
    date: string;
    timezone: string;
    location: string;
    currency: string;
    notes: string;
  } | null;
  onWeddingFormChange: (updater: (prev: {
    name: string;
    date: string;
    timezone: string;
    location: string;
    currency: string;
    notes: string;
  } | null) => {
    name: string;
    date: string;
    timezone: string;
    location: string;
    currency: string;
    notes: string;
  } | null) => void;
  isWeddingSaving: boolean;
  onSave: () => void;
  weddingSaveError: string | null;
  coverImageUrl: string | null | undefined;
  isCoverImageUploading: boolean;
  coverImageError: string | null;
  onChooseCover: () => void;
  onRemoveCover: () => void;
  onClearErrors: () => void;
  canEditWedding: boolean;
};

export function WeddingDashboardDetailsDialog({
  open,
  onOpenChange,
  weddingForm,
  onWeddingFormChange,
  isWeddingSaving,
  onSave,
  weddingSaveError,
  coverImageUrl,
  isCoverImageUploading,
  coverImageError,
  onChooseCover,
  onRemoveCover,
  onClearErrors,
  canEditWedding,
}: WeddingDashboardDetailsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        onClearErrors();
      }
    }}>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("dashboard.overview.edit.title")}</DialogTitle>
          <DialogDescription>{t("dashboard.overview.edit.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="wedding-name" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.name")}</label>
            <Input
              id="wedding-name"
              value={weddingForm?.name ?? ""}
              onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
              placeholder={t("dashboard.overview.edit.namePlaceholder")}
              disabled={isWeddingSaving || !canEditWedding}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="wedding-date" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.date")}</label>
              <Input
                id="wedding-date"
                type="date"
                value={weddingForm?.date ?? ""}
                onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, date: event.target.value } : prev))}
                disabled={isWeddingSaving || !canEditWedding}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="wedding-currency" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.currency")}</label>
              <Input
                id="wedding-currency"
                value={weddingForm?.currency ?? ""}
                onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, currency: event.target.value.toUpperCase() } : prev))}
                placeholder="PLN"
                maxLength={3}
                disabled={isWeddingSaving || !canEditWedding}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wedding-timezone" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.timezone")}</label>
            <Input
              id="wedding-timezone"
              value={weddingForm?.timezone ?? ""}
              onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, timezone: event.target.value } : prev))}
              placeholder="Europe/Warsaw"
              disabled={isWeddingSaving || !canEditWedding}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wedding-location" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.location")}</label>
            <Input
              id="wedding-location"
              value={weddingForm?.location ?? ""}
              onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, location: event.target.value } : prev))}
              placeholder={t("dashboard.overview.edit.locationPlaceholder")}
              disabled={isWeddingSaving || !canEditWedding}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-zinc-800">{t("dashboard.overview.cover.title")}</p>
            <p className="text-xs text-zinc-500">{t("dashboard.overview.cover.description")}</p>
            <div className="overflow-hidden rounded-md border border-zinc-200">
              {coverImageUrl ? (
                <div className="relative h-36 w-full">
                  <Image src={coverImageUrl} alt={t("dashboard.overview.cover.previewAlt")} fill sizes="640px" className="object-cover" />
                </div>
              ) : (
                <div className="h-36 w-full bg-gradient-to-br from-rose-100 via-amber-50 to-violet-100" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={isCoverImageUploading || isWeddingSaving || !canEditWedding} onClick={onChooseCover}>
                {coverImageUrl ? t("dashboard.overview.cover.replace") : t("dashboard.overview.cover.upload")}
              </Button>
              {coverImageUrl ? (
                <Button type="button" variant="outline" disabled={isCoverImageUploading || isWeddingSaving || !canEditWedding} onClick={onRemoveCover}>
                  {t("dashboard.overview.cover.remove")}
                </Button>
              ) : null}
            </div>
            {isCoverImageUploading ? <p className="text-xs text-zinc-500">{t("dashboard.overview.cover.uploading")}</p> : null}
            {coverImageError ? <p className="text-sm text-red-600">{coverImageError}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wedding-notes" className="text-sm font-medium text-zinc-800">{t("dashboard.overview.edit.notes")}</label>
            <textarea
              id="wedding-notes"
              value={weddingForm?.notes ?? ""}
              onChange={(event) => onWeddingFormChange((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
              className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-300"
              placeholder={t("dashboard.overview.edit.notesPlaceholder")}
              disabled={isWeddingSaving || !canEditWedding}
            />
          </div>
          {weddingSaveError ? <p className="text-sm text-red-600">{weddingSaveError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isWeddingSaving}>{t("common.cancel")}</Button>
            <Button type="button" onClick={onSave} disabled={isWeddingSaving || !canEditWedding}>{isWeddingSaving ? t("common.saving") : t("common.save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
