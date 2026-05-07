import { useRef, useState, type ChangeEventHandler } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/i18n/provider";
import { parseGuestCsvForImport } from "../lib/guest-import";

type Guest = {
  name: string;
  group: {
    name: string;
  } | null;
  notes: string | null;
};

type GuestImportRow = {
  lineNumber: number;
  name: string;
  include: boolean;
};

type GuestImportSummary = {
  created: number;
  createdPlusOnes: number;
  skippedDuplicates: number;
  skippedInvalidMarkers: number;
  skippedRelationshipConflicts: number;
  warnings: string[];
};

type GuestDataToolsProps = {
  guests: Guest[];
  onBulkImportGuests: (rows: GuestImportRow[]) => Promise<GuestImportSummary>;
  onAfterImport?: () => void;
  compact?: boolean;
};

export function GuestDataTools({
  guests,
  onBulkImportGuests,
  onAfterImport,
  compact = false,
}: GuestDataToolsProps) {
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<
    Array<{
      lineNumber: number;
      name: string;
      include: boolean;
      isDuplicate: boolean;
      isMarker: boolean;
    }>
  >([]);
  const [importSummary, setImportSummary] = useState<GuestImportSummary | null>(null);

  const handleExportCsv = () => {
    const header = "name,group,notes";
    const rows = guests.map((guest) =>
      [guest.name, guest.group?.name ?? "", guest.notes ?? ""]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "guests.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCsv: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parseResult = parseGuestCsvForImport(
      text,
      guests.map((guest) => guest.name),
    );

    setImportSummary(null);
    setImportError(null);
    setImportPreviewRows(
      parseResult.rows.map((row) => ({
        lineNumber: row.lineNumber,
        name: row.name,
        isDuplicate: row.isDuplicate,
        isMarker: row.isMarker,
        include: row.isMarker ? true : !row.isDuplicate,
      })),
    );
    event.target.value = "";
  };

  const toggleImportDuplicateRow = (lineNumber: number) => {
    setImportPreviewRows((current) =>
      current.map((row) =>
        row.lineNumber === lineNumber && row.isDuplicate
          ? { ...row, include: !row.include }
          : row,
      ),
    );
  };

  const clearImportPreview = () => {
    setImportPreviewRows([]);
  };

  const handleConfirmImport = async () => {
    if (importPreviewRows.length === 0) return;

    setIsImportSubmitting(true);
    try {
      setImportError(null);
      const summary = await onBulkImportGuests(
        importPreviewRows.map((row) => ({
          lineNumber: row.lineNumber,
          name: row.name,
          include: row.include,
        })),
      );
      setImportSummary(summary);
      clearImportPreview();
      onAfterImport?.();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("guestPanel.importFailed"));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportCsv}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => importInputRef.current?.click()}
        >
          {t("guestPanel.import")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleExportCsv}>
          {t("guestPanel.export")}
        </Button>
      </div>

      {importPreviewRows.length > 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold text-zinc-900">{t("guestPanel.importReviewTitle")}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {t("guestPanel.importReviewSummary", {
              total: importPreviewRows.length,
              duplicates: importPreviewRows.filter((row) => row.isDuplicate).length,
            })}
          </p>
          {importPreviewRows.some((row) => row.isDuplicate === true) ? (
            <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded border border-zinc-200 p-2">
              {importPreviewRows
                .filter((row) => row.isDuplicate)
                .map((row) => (
                  <label
                    key={row.lineNumber}
                    htmlFor={`import-duplicate-${row.lineNumber}`}
                    className="flex items-center gap-2 text-xs text-zinc-700"
                  >
                    <Checkbox
                      id={`import-duplicate-${row.lineNumber}`}
                      checked={row.include}
                      disabled={isImportSubmitting}
                      onCheckedChange={() => toggleImportDuplicateRow(row.lineNumber)}
                    />
                    <span className="truncate">
                      {t("guestPanel.importDuplicateRow", {
                        line: row.lineNumber,
                        name: row.name,
                      })}
                    </span>
                  </label>
                ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isImportSubmitting}
              aria-busy={isImportSubmitting}
              onClick={() => void handleConfirmImport()}
            >
              {isImportSubmitting ? t("guestPanel.importing") : t("guestPanel.importConfirm")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isImportSubmitting}
              onClick={clearImportPreview}
            >
              {t("common.cancel")}
            </Button>
          </div>
          {isImportSubmitting ? (
            <p className="mt-2 text-xs text-zinc-600">
              {t("guestPanel.importInProgress", { count: importPreviewRows.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      {importError ? <p className="text-xs text-red-700">{importError}</p> : null}

      {importSummary ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
          <p className="font-semibold text-zinc-900">{t("guestPanel.importResultTitle")}</p>
          <p>
            {t("guestPanel.importResultCounts", {
              created: importSummary.created,
              plusOnes: importSummary.createdPlusOnes,
              skippedDuplicates: importSummary.skippedDuplicates,
              skippedInvalidMarkers: importSummary.skippedInvalidMarkers,
              skippedConflicts: importSummary.skippedRelationshipConflicts,
            })}
          </p>
          {importSummary.warnings.length > 0 ? (
            <ul className="mt-1 list-disc pl-4">
              {importSummary.warnings.slice(0, 5).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
