import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import { parseGuestCsvForImport } from "../lib/guest-import";
import { createGuestDragPreview } from "../lib/drag-preview";
import type {
  PreferredSeating,
  RelationshipType,
  SeatingRelationship,
} from "../types/relationship.types";

type Guest = {
  id: string;
  name: string;
  group: string | null;
  notes: string | null;
  isPlaceholderPlusOne: boolean;
  plusOneHostGuestId: string | null;
  assignment: {
    id: string;
    seatNumber: number;
    tableId: string;
  } | null;
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

type RelationshipForm = {
  type: RelationshipType;
  name: string;
  preferredSeating: PreferredSeating;
  moveTogetherDefault: boolean;
  strict: boolean;
};

type GuestPanelProps = {
  guests: Guest[];
  relationships: SeatingRelationship[];
  tableLabelById: Record<string, string>;
  selectedGuestId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onCreateGuest: (name: string) => Promise<void>;
  onBulkImportGuests: (rows: GuestImportRow[]) => Promise<GuestImportSummary>;
  onCreateRelationship: (
    payload: RelationshipForm & { guestIds: string[] },
  ) => Promise<void>;
  variant?: "desktop" | "sheet";
  onGuestSelected?: (guestId: string | null) => void;
  enableGuestDnD?: boolean;
  onGuestDragStart?: (guestId: string) => void;
  onGuestDragEnd?: () => void;
  linkingSourceGuestId?: string | null;
  onLinkingSourceApplied?: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function GuestPanel({
  guests,
  relationships,
  tableLabelById,
  selectedGuestId,
  isLoading,
  error,
  onSelectGuest,
  onCreateGuest,
  onBulkImportGuests,
  onCreateRelationship,
  variant = "desktop",
  onGuestSelected,
  enableGuestDnD = false,
  onGuestDragStart,
  onGuestDragEnd,
  linkingSourceGuestId = null,
  onLinkingSourceApplied,
}: GuestPanelProps) {
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unseated" | "assigned">("all");
  const [newGuestName, setNewGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [selectedRelationshipGuestIds, setSelectedRelationshipGuestIds] = useState<
    string[]
  >([]);
  const [isRelationshipSubmitting, setIsRelationshipSubmitting] = useState(false);
  const [newRelationshipType, setNewRelationshipType] =
    useState<RelationshipType>("couple");
  const [newRelationshipName, setNewRelationshipName] = useState("");
  const [newRelationshipPreferredSeating, setNewRelationshipPreferredSeating] =
    useState<PreferredSeating>("none");
  const [newRelationshipMoveTogetherDefault, setNewRelationshipMoveTogetherDefault] =
    useState(false);
  const [newRelationshipStrict, setNewRelationshipStrict] = useState(false);

  const visibleGuests = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "assigned"
            ? guest.assignment !== null
            : guest.assignment === null;
      const matchesQuery =
        queryLower.length === 0
          ? true
          : guest.name.toLowerCase().includes(queryLower) ||
            (guest.group ?? "").toLowerCase().includes(queryLower);
      return matchesFilter && matchesQuery;
    });
  }, [filter, guests, query]);

  const relationshipsByGuestId = useMemo(() => {
    const next: Record<string, SeatingRelationship[]> = {};
    for (const relationship of relationships) {
      for (const guestId of relationship.guestIds) {
        if (!next[guestId]) {
          next[guestId] = [];
        }
        next[guestId].push(relationship);
      }
    }
    return next;
  }, [relationships]);

  const totalGuests = guests.length;
  const seatedGuests = guests.filter((guest) => guest.assignment !== null).length;
  const unseatedGuests = totalGuests - seatedGuests;
  void unseatedGuests;

  const handleCreateGuest = async () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onCreateGuest(trimmed);
      setNewGuestName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rootClassName =
    variant === "sheet"
      ? "flex h-full w-full flex-col bg-zinc-50"
      : "order-2 flex w-full flex-col border-t border-zinc-200 bg-zinc-50 lg:order-1 lg:h-full lg:w-[360px] lg:shrink-0 lg:border-r lg:border-t-0";

  const handleExportCsv = () => {
    const header = "name,group,notes";
    const rows = guests.map((guest) =>
      [guest.name, guest.group ?? "", guest.notes ?? ""]
        .map((value) => `"${value.replaceAll("\"", "\"\"")}"`)
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
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("guestPanel.importFailed"));
    } finally {
      setIsImportSubmitting(false);
    }
  };

  useEffect(() => {
    if (!linkingSourceGuestId) return;
    onSelectGuest(null);
    const timer = window.setTimeout(() => {
      setSelectedRelationshipGuestIds([linkingSourceGuestId]);
      onLinkingSourceApplied?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [linkingSourceGuestId, onLinkingSourceApplied, onSelectGuest]);

  const selectGuestForRelationship = (guestId: string) => {
    setSelectedRelationshipGuestIds((current) => {
      if (current.length === 0) return [guestId];
      const sourceGuestId = current[0];
      if (guestId === sourceGuestId) return current;
      if (current.length === 1) return [sourceGuestId, guestId];
      if (current[1] === guestId) return current;
      return [sourceGuestId, guestId];
    });
  };

  const handleCreateRelationship = async () => {
    if (selectedRelationshipGuestIds.length < 2) return;
    setIsRelationshipSubmitting(true);
    try {
      await onCreateRelationship({
        type: newRelationshipType,
        name: newRelationshipName.trim(),
        preferredSeating: newRelationshipPreferredSeating,
        moveTogetherDefault: newRelationshipMoveTogetherDefault,
        strict: newRelationshipStrict,
        guestIds: selectedRelationshipGuestIds,
      });
      setSelectedRelationshipGuestIds([]);
      setNewRelationshipName("");
      setNewRelationshipMoveTogetherDefault(false);
      setNewRelationshipStrict(false);
      setNewRelationshipPreferredSeating("none");
      setNewRelationshipType("couple");
    } finally {
      setIsRelationshipSubmitting(false);
    }
  };

  const relationshipTypeLabel: Record<RelationshipType, string> = {
    couple: t("guestPanel.relationshipType.couple"),
    family: t("guestPanel.relationshipType.family"),
    group: t("guestPanel.relationshipType.group"),
    custom: t("guestPanel.relationshipType.custom"),
    plus_one: t("guestPanel.relationshipType.plus_one"),
  };

  const isLinkingMode = selectedRelationshipGuestIds.length > 0;
  const selectedLinkGuests = selectedRelationshipGuestIds
    .map((guestId) => guests.find((guest) => guest.id === guestId))
    .filter((guest): guest is Guest => guest !== undefined);

  return (
    <aside className={rootClassName}>
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">{t("guestPanel.title")}</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={newGuestName}
            onChange={(event) => setNewGuestName(event.target.value)}
            placeholder={t("guestPanel.addGuestPlaceholder")}
          />
          <Button type="button" disabled={isSubmitting} onClick={handleCreateGuest}>
            {t("common.add")}
          </Button>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
          />
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
          <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold text-zinc-900">
              {t("guestPanel.importReviewTitle")}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {t("guestPanel.importReviewSummary", {
                total: importPreviewRows.length,
                duplicates: importPreviewRows.filter((row) => row.isDuplicate).length,
              })}
            </p>
            {importPreviewRows.some((row) => row.isDuplicate === true) ? (
              <div className="mt-2 max-h-32 space-y-1 overflow-auto rounded border border-zinc-200 p-2">
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
                {isImportSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-90"
                      />
                    </svg>
                    {t("guestPanel.importing")}
                  </span>
                ) : (
                  t("guestPanel.importConfirm")
                )}
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
        {importError ? (
          <p className="mt-2 text-xs text-red-700">{importError}</p>
        ) : null}
        {importSummary ? (
          <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-700">
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
      <Separator />
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">{t("guestPanel.guestList")}</p>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">
              {t("guestPanel.guestsSeated", { seated: seatedGuests, total: totalGuests })}
            </Badge>
          </div>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("guestPanel.searchPlaceholder")}
        />
        <div className="flex gap-2">
          {(["all", "unseated", "assigned"] as const).map((next) => (
            <Button
              key={next}
              type="button"
              size="sm"
              variant={filter === next ? "default" : "outline"}
              onClick={() => setFilter(next)}
            >
              {next === "all"
                ? t("guestPanel.filterAll")
                : next === "unseated"
                  ? t("guestPanel.filterUnseated")
                  : t("guestPanel.filterAssigned")}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{t("guestPanel.showing", { count: visibleGuests.length })}</p>
      </div>
      {error ? <div className="px-4 pb-3 text-xs text-red-700">{error}</div> : null}
      <ScrollArea className="flex-1 border-t border-zinc-200">
        {isLoading ? (
          <p className="p-4 text-sm text-zinc-600">{t("guestPanel.loading")}</p>
        ) : visibleGuests.length === 0 ? (
          <p className="p-4 text-sm text-zinc-600">{t("guestPanel.empty")}</p>
        ) : (
          <ul className="p-2">
            {visibleGuests.map((guest) => {
              const guestRelationships = relationshipsByGuestId[guest.id] ?? [];
              const isSelectedForRelationship =
                selectedRelationshipGuestIds.includes(guest.id);
              const isSelectedGuestRow = selectedGuestId === guest.id;

              return (
                <li key={guest.id}>
                  <div className="mb-1 flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      draggable={variant === "desktop" && enableGuestDnD}
                      onDragStart={(event) => {
                        if (!(variant === "desktop" && enableGuestDnD)) return;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", guest.id);
                        const preview = createGuestDragPreview(guest.name);
                        event.dataTransfer.setDragImage(preview, 18, 18);
                        requestAnimationFrame(() => {
                          preview.remove();
                        });
                        onGuestDragStart?.(guest.id);
                      }}
                      onDragEnd={() => {
                        if (!(variant === "desktop" && enableGuestDnD)) return;
                        onGuestDragEnd?.();
                      }}
                      onClick={() => {
                        if (isLinkingMode) {
                          selectGuestForRelationship(guest.id);
                          return;
                        }
                        const nextGuestId = selectedGuestId === guest.id ? null : guest.id;
                        onSelectGuest(nextGuestId);
                        onGuestSelected?.(nextGuestId);
                      }}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border px-3 py-2 text-left ${
                        isSelectedForRelationship
                          ? "border-blue-300 bg-blue-50/70"
                          : isSelectedGuestRow
                          ? "border-zinc-400 bg-zinc-100"
                          : "border-transparent hover:border-zinc-200 hover:bg-zinc-100/70"
                      }`}
                    >
                      <Avatar>
                        <AvatarFallback>{getInitials(guest.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {guest.name}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {guest.assignment
                            ? `${tableLabelById[guest.assignment.tableId] ?? t("guestPanel.tableFallback")} • ${t("guestPanel.seat", { seat: guest.assignment.seatNumber })} • ${t("guestPanel.assigned")}`
                            : t("guestPanel.unseated")}
                        </p>
                        {guestRelationships.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {guestRelationships.map((relationship) => (
                              <Badge
                                key={relationship.id}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {relationship.name?.trim().length
                                  ? relationship.name
                                  : relationshipTypeLabel[relationship.type]}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {isLinkingMode ? (
        <div className="border-t border-zinc-200 px-4 py-3">
          <p className="text-xs font-semibold text-zinc-800">
            {t("guestPanel.createRelationship", {
              count: selectedRelationshipGuestIds.length,
            })}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {selectedRelationshipGuestIds.length < 2
              ? t("guestPanel.linkPickSecond")
              : t("guestPanel.linkReplaceNotice")}
          </p>
          <div className="mt-2 space-y-1">
            {selectedLinkGuests.map((guest) => {
              const existing = (relationshipsByGuestId[guest.id] ?? [])[0] ?? null;
              return (
                <p key={guest.id} className="text-xs text-zinc-600">
                  <span className="font-medium text-zinc-800">{guest.name}</span>
                  {" — "}
                  {existing
                    ? existing.name?.trim().length
                      ? existing.name
                      : relationshipTypeLabel[existing.type]
                    : t("guestPanel.noRelationships")}
                </p>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={newRelationshipType}
              onChange={(event) =>
                setNewRelationshipType(event.target.value as RelationshipType)
              }
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="couple">{t("guestPanel.relationshipType.couple")}</option>
              <option value="family">{t("guestPanel.relationshipType.family")}</option>
              <option value="group">{t("guestPanel.relationshipType.group")}</option>
              <option value="custom">{t("guestPanel.relationshipType.custom")}</option>
            </select>
            <select
              value={newRelationshipPreferredSeating}
              onChange={(event) =>
                setNewRelationshipPreferredSeating(
                  event.target.value as PreferredSeating,
                )
              }
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="none">{t("guestPanel.preferredSeating.none")}</option>
              <option value="adjacent">{t("guestPanel.preferredSeating.adjacent")}</option>
              <option value="nearby">{t("guestPanel.preferredSeating.nearby")}</option>
              <option value="same-table">{t("guestPanel.preferredSeating.same-table")}</option>
            </select>
          </div>
          <Input
            className="mt-2 h-9 text-xs"
            placeholder={t("guestPanel.relationshipNamePlaceholder")}
            value={newRelationshipName}
            onChange={(event) => setNewRelationshipName(event.target.value)}
          />
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-700">
            <label className="inline-flex items-center gap-1.5">
              <Checkbox
                checked={newRelationshipMoveTogetherDefault}
                onCheckedChange={(checked) =>
                  setNewRelationshipMoveTogetherDefault(checked === true)
                }
              />
              <TooltipProvider delayDuration={1000}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{t("guestPanel.moveTogetherDefault")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("guestPanel.moveTogetherHelp")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <Checkbox
                checked={newRelationshipStrict}
                onCheckedChange={(checked) =>
                  setNewRelationshipStrict(checked === true)
                }
              />
              <TooltipProvider delayDuration={1000}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{t("guestPanel.strict")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("guestPanel.strictHelp")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={
                selectedRelationshipGuestIds.length < 2 || isRelationshipSubmitting
              }
              onClick={() => void handleCreateRelationship()}
            >
              {t("guestPanel.createRelationshipAction")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setSelectedRelationshipGuestIds([])}
            >
              {t("guestPanel.clear")}
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
