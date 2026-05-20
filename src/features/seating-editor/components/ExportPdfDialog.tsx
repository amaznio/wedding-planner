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

import type { DetailSeatLabelMode, ExportOrientation, ExportPaper } from "@/features/seating-export/types/print-model";

type ExportPdfDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: {
    paper: ExportPaper;
    orientation: ExportOrientation;
    includeEmptySeats: boolean;
    overviewShowSeats: boolean;
    detailSeatLabelMode: DetailSeatLabelMode;
  }) => Promise<void>;
};

export function ExportPdfDialog({ open, onOpenChange, onExport }: ExportPdfDialogProps) {
  const { t } = useI18n();
  const [paper, setPaper] = useState<ExportPaper>("A4");
  const [orientation, setOrientation] = useState<ExportOrientation>("landscape");
  const [includeEmptySeats, setIncludeEmptySeats] = useState(true);
  const [overviewShowSeats, setOverviewShowSeats] = useState(false);
  const [detailSeatLabelMode, setDetailSeatLabelMode] = useState<DetailSeatLabelMode>("number");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExport({
        paper,
        orientation,
        includeEmptySeats,
        overviewShowSeats,
        detailSeatLabelMode,
      });
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("exportPdf.title")}</DialogTitle>
          <DialogDescription>{t("exportPdf.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">{t("exportPdf.paper")}</p>
              <Select value={paper} onValueChange={(value) => setPaper(value as ExportPaper)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-zinc-900">{t("exportPdf.orientation")}</p>
              <Select
                value={orientation}
                onValueChange={(value) => setOrientation(value as ExportOrientation)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">{t("exportPdf.landscape")}</SelectItem>
                  <SelectItem value="portrait">{t("exportPdf.portrait")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-zinc-900">{t("exportPdf.detailSeatLabels")}</p>
            <Select
              value={detailSeatLabelMode}
              onValueChange={(value) => setDetailSeatLabelMode(value as DetailSeatLabelMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">{t("exportPdf.labelNumber")}</SelectItem>
                <SelectItem value="initials">{t("exportPdf.labelInitials")}</SelectItem>
              </SelectContent>
            </Select>
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
