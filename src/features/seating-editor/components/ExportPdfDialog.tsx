"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/provider";

import type {
  DetailSeatLabelMode,
  ExportOrientation,
  ExportPaper,
  PdfThemeId,
} from "@/features/seating-export/types/print-model";

type ExportPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: {
    theme: PdfThemeId;
    paper: ExportPaper;
    orientation: ExportOrientation;
    includeEmptySeats: boolean;
    overviewShowSeats: boolean;
    detailSeatLabelMode: DetailSeatLabelMode;
    detailTableVertical: boolean;
  }) => Promise<void>;
};

export function ExportPdfDialog({ open, onOpenChange, onExport }: ExportPdfDialogProps) {
  const { t } = useI18n();
  const [paper, setPaper] = useState<ExportPaper>("A4");
  const [theme, setTheme] = useState<PdfThemeId>("simple");
  const [orientation, setOrientation] = useState<ExportOrientation>("landscape");
  const [includeEmptySeats, setIncludeEmptySeats] = useState(true);
  const [overviewShowSeats, setOverviewShowSeats] = useState(false);
  const [detailSeatLabelMode, setDetailSeatLabelMode] = useState<DetailSeatLabelMode>("number");
  const [detailTableVertical, setDetailTableVertical] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExport({
        theme,
        paper,
        orientation,
        includeEmptySeats,
        overviewShowSeats,
        detailSeatLabelMode,
        detailTableVertical,
      });
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  const previewThemeClass =
    theme === "elegant"
      ? "bg-amber-50 text-amber-950 border-amber-200"
      : theme === "modern"
        ? "bg-zinc-50 text-zinc-950 border-zinc-300"
        : "bg-white text-zinc-900 border-zinc-200";

  const previewTableClass =
    theme === "elegant"
      ? "border-amber-500/70 bg-amber-50"
      : theme === "modern"
        ? "border-zinc-800/80 bg-zinc-100"
        : "border-zinc-400 bg-zinc-100";

  const previewSeatClass =
    theme === "elegant"
      ? "border-amber-400/80 bg-amber-100/80"
      : theme === "modern"
        ? "border-zinc-700 bg-zinc-100"
        : "border-zinc-400 bg-zinc-100";

  const previewHeadingFontClass = theme === "elegant" ? "font-serif" : "font-sans";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("exportPdf.title")}</DialogTitle>
          <DialogDescription>{t("exportPdf.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1.5 sm:w-[280px]">
              <p className="text-sm font-medium text-zinc-900">{t("exportPdf.theme")}</p>
              <Select value={theme} onValueChange={(value) => setTheme(value as PdfThemeId)}>
                <SelectTrigger aria-label={t("exportPdf.theme")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">{t("exportPdf.themeSimple")}</SelectItem>
                  <SelectItem value="elegant">{t("exportPdf.themeElegant")}</SelectItem>
                  <SelectItem value="modern">{t("exportPdf.themeModern")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:ml-auto sm:grid-cols-2">
              <div className="space-y-1.5 sm:w-[160px]">
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.paper")}</p>
                <Select value={paper} onValueChange={(value) => setPaper(value as ExportPaper)}>
                  <SelectTrigger aria-label={t("exportPdf.paper")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:w-[160px]">
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.orientation")}</p>
                <Select
                  value={orientation}
                  onValueChange={(value) => setOrientation(value as ExportOrientation)}
                >
                  <SelectTrigger aria-label={t("exportPdf.orientation")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">{t("exportPdf.landscape")}</SelectItem>
                    <SelectItem value="portrait">{t("exportPdf.portrait")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900">{t("exportPdf.preview")}</p>
            <div className={`rounded-md border p-3 ${previewThemeClass}`}>
              <div className="mb-3 flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${previewHeadingFontClass}`}>{t("exportPdf.previewTable")}</span>
                <span className="opacity-80">{paper} • {t(`exportPdf.${orientation}`)}</span>
              </div>
              <div className="relative h-28 rounded border border-current/35 p-2">
                <div
                  className={`absolute rounded-sm border text-center ${previewTableClass} ${previewHeadingFontClass} ${
                    detailTableVertical
                      ? "left-1/2 top-4 h-18 w-10 -translate-x-1/2 px-1 py-0.5 text-[11px]"
                      : "left-6 right-6 top-11 px-2 py-1 text-[11px]"
                  }`}
                >
                  {t("exportPdf.previewTable")}
                </div>
                {detailTableVertical ? (
                  <>
                    <div className={`absolute left-[calc(50%-2.2rem)] top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%-2.2rem)] top-9 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%-2.2rem)] top-14 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%-2.2rem)] top-19 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%+1.4rem)] top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%+1.4rem)] top-9 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%+1.4rem)] top-14 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-[calc(50%+1.4rem)] top-19 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                  </>
                ) : (
                  <>
                    <div className={`absolute left-8 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-14 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-20 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-20 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-14 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-8 top-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-8 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-14 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute left-20 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-20 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-14 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                    <div className={`absolute right-8 bottom-4 h-3 w-3 rounded-full border ${previewSeatClass}`} />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900">{t("exportPdf.detailOptions")}</p>

            <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.includeEmptySeats")}</p>
                <p className="text-xs text-zinc-500">{t("exportPdf.includeEmptySeatsHelp")}</p>
              </div>
              <Switch checked={includeEmptySeats} onCheckedChange={setIncludeEmptySeats} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.overviewShowSeats")}</p>
                <p className="text-xs text-zinc-500">{t("exportPdf.overviewShowSeatsHelp")}</p>
              </div>
              <Switch checked={overviewShowSeats} onCheckedChange={setOverviewShowSeats} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.detailSeatLabels")}</p>
                <p className="text-xs text-zinc-500">{t("exportPdf.detailSeatLabelsHelp")}</p>
              </div>
              <Select
                value={detailSeatLabelMode}
                onValueChange={(value) => setDetailSeatLabelMode(value as DetailSeatLabelMode)}
              >
                <SelectTrigger className="w-[220px] shrink-0" aria-label={t("exportPdf.detailSeatLabels")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">{t("exportPdf.labelNumber")}</SelectItem>
                  <SelectItem value="initials">{t("exportPdf.labelInitials")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">{t("exportPdf.detailTableVertical")}</p>
                <p className="text-xs text-zinc-500">{t("exportPdf.detailTableVerticalHelp")}</p>
              </div>
              <Switch checked={detailTableVertical} onCheckedChange={setDetailTableVertical} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isExporting ? t("exportPdf.exporting") : t("exportPdf.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
