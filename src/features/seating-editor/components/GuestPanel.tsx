import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronRight,
  Download,
  Ellipsis,
  Link2,
  Plus,
  Settings,
  Shapes,
  Upload,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/provider";
import { createGuestDragPreview } from "../lib/drag-preview";
import { resolveEffectiveGuestGroup } from "../lib/guest-group";
import type {
  PreferredSeating,
  RelationshipType,
  SeatingRelationship,
} from "../types/relationship.types";

type Guest = {
  id: string;
  name: string;
  groupId: string | null;
  group: {
    id: string;
    name: string;
    color: string;
  } | null;
  notes: string | null;
  isPlaceholderPlusOne: boolean;
  plusOneHostGuestId: string | null;
  assignment: {
    id: string;
    seatNumber: number;
    tableId: string;
  } | null;
};

type PairRowStatus = "assigned" | "unseated" | "split";

type GuestListRow =
  | {
      kind: "single";
      key: string;
      guest: Guest;
    }
  | {
      kind: "pair";
      key: string;
      relationship: SeatingRelationship;
      guests: [Guest, Guest];
      status: PairRowStatus;
    };

type RelationshipForm = {
  type: RelationshipType;
  name: string;
  preferredSeating: PreferredSeating;
  moveTogetherDefault: boolean;
  strict: boolean;
};

const LINKING_DEFAULTS: RelationshipForm = {
  type: "couple",
  name: "",
  preferredSeating: "adjacent",
  moveTogetherDefault: true,
  strict: true,
};

type GuestPanelProps = {
  guests: Guest[];
  groups: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  relationships: SeatingRelationship[];
  tableLabelById: Record<string, string>;
  selectedGuestId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onCreateGuest: (payload: {
    name: string;
    groupId?: string | null;
    notes?: string;
  }) => Promise<void>;
  onCreateRelationship: (
    payload: RelationshipForm & { guestIds: string[] },
  ) => Promise<void>;
  variant?: "desktop" | "sheet";
  showHeader?: boolean;
  showQuickAdd?: boolean;
  onOpenGroupsManager?: () => void;
  onOpenDataTools?: () => void;
  onExportGuests?: () => void;
  onOpenLegend?: () => void;
  onOpenSettings?: () => void;
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

function getPairRowStatus(first: Guest, second: Guest): PairRowStatus {
  const firstTableId = first.assignment?.tableId ?? null;
  const secondTableId = second.assignment?.tableId ?? null;
  if (!firstTableId && !secondTableId) return "unseated";
  if (firstTableId && secondTableId && firstTableId === secondTableId) return "assigned";
  return "split";
}

export function GuestPanel({
  guests,
  groups,
  relationships,
  tableLabelById,
  selectedGuestId,
  isLoading,
  error,
  onSelectGuest,
  onCreateGuest,
  onCreateRelationship,
  variant = "desktop",
  showHeader = true,
  showQuickAdd,
  onOpenGroupsManager,
  onOpenDataTools,
  onExportGuests,
  onOpenLegend,
  onOpenSettings,
  onGuestSelected,
  enableGuestDnD = false,
  onGuestDragStart,
  onGuestDragEnd,
  linkingSourceGuestId = null,
  onLinkingSourceApplied,
}: GuestPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unseated" | "assigned">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestGroupId, setNewGuestGroupId] = useState<string>("");
  const [newGuestNotes, setNewGuestNotes] = useState("");
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRelationshipGuestIds, setSelectedRelationshipGuestIds] = useState<
    string[]
  >([]);
  const [isRelationshipSubmitting, setIsRelationshipSubmitting] = useState(false);
  const [newRelationshipType, setNewRelationshipType] =
    useState<RelationshipType>(LINKING_DEFAULTS.type);
  const [newRelationshipName, setNewRelationshipName] = useState(LINKING_DEFAULTS.name);
  const [newRelationshipPreferredSeating, setNewRelationshipPreferredSeating] =
    useState<PreferredSeating>(LINKING_DEFAULTS.preferredSeating);
  const [newRelationshipMoveTogetherDefault, setNewRelationshipMoveTogetherDefault] =
    useState(LINKING_DEFAULTS.moveTogetherDefault);
  const [newRelationshipStrict, setNewRelationshipStrict] = useState(
    LINKING_DEFAULTS.strict,
  );
  const [expandedPairRowIds, setExpandedPairRowIds] = useState<string[]>([]);

  const guestsById = useMemo<Record<string, Guest>>(() => {
    return Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  }, [guests]);
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
  const tableFilterOptions = useMemo(
    () =>
      Object.entries(tableLabelById)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tableLabelById],
  );
  const allRows = useMemo<GuestListRow[]>(() => {
    const rows: GuestListRow[] = [];
    const emittedGuestIds = new Set<string>();

    for (const guest of guests) {
      if (emittedGuestIds.has(guest.id)) continue;
      const candidatePairRelationship = (relationshipsByGuestId[guest.id] ?? []).find(
        (relationship) => {
          if (relationship.guestIds.length !== 2) return false;
          const [firstGuestId, secondGuestId] = relationship.guestIds;
          if (!firstGuestId || !secondGuestId || firstGuestId === secondGuestId) return false;
          const firstGuest = guestsById[firstGuestId];
          const secondGuest = guestsById[secondGuestId];
          if (!firstGuest || !secondGuest) return false;
          if (emittedGuestIds.has(firstGuest.id) || emittedGuestIds.has(secondGuest.id)) {
            return false;
          }
          return true;
        },
      );

      if (!candidatePairRelationship) {
        emittedGuestIds.add(guest.id);
        rows.push({ kind: "single", key: guest.id, guest });
        continue;
      }

      const firstGuest = guestsById[candidatePairRelationship.guestIds[0]];
      const secondGuest = guestsById[candidatePairRelationship.guestIds[1]];
      if (!firstGuest || !secondGuest) {
        emittedGuestIds.add(guest.id);
        rows.push({ kind: "single", key: guest.id, guest });
        continue;
      }

      emittedGuestIds.add(firstGuest.id);
      emittedGuestIds.add(secondGuest.id);
      rows.push({
        kind: "pair",
        key: candidatePairRelationship.id,
        relationship: candidatePairRelationship,
        guests: [firstGuest, secondGuest],
        status: getPairRowStatus(firstGuest, secondGuest),
      });
    }

    return rows;
  }, [guests, guestsById, relationshipsByGuestId]);
  const totalGuestCount = guests.length;
  const getRowGuestCount = (row: GuestListRow): number => (row.kind === "pair" ? 2 : 1);
  const visibleRows = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    return allRows.filter((row) => {
      if (row.kind === "single") {
        const effectiveGroup = resolveEffectiveGuestGroup(row.guest, guestsById);
        const assignedTableId = row.guest.assignment?.tableId ?? null;
        const matchesStatusFilter =
          filter === "all"
            ? true
            : filter === "assigned"
              ? row.guest.assignment !== null
              : row.guest.assignment === null;
        const matchesGroupFilter =
          groupFilter === "all"
            ? true
            : groupFilter === "ungrouped"
              ? effectiveGroup === null
              : effectiveGroup?.id === groupFilter;
        const matchesTableFilter =
          tableFilter === "all"
            ? true
            : tableFilter === "unassigned"
              ? assignedTableId === null
              : assignedTableId === tableFilter;
        const matchesQuery =
          queryLower.length === 0
            ? true
            : row.guest.name.toLowerCase().includes(queryLower) ||
              (effectiveGroup?.name ?? "").toLowerCase().includes(queryLower) ||
              (assignedTableId
                ? (tableLabelById[assignedTableId] ?? "").toLowerCase()
                : ""
              ).includes(queryLower);

        return (
          matchesStatusFilter &&
          matchesGroupFilter &&
          matchesTableFilter &&
          matchesQuery
        );
      }

      const memberMeta = row.guests.map((guest) => {
        const effectiveGroup = resolveEffectiveGuestGroup(guest, guestsById);
        const assignedTableId = guest.assignment?.tableId ?? null;
        return {
          guest,
          effectiveGroup,
          assignedTableId,
        };
      });

      const matchesStatusFilter =
        filter === "all"
          ? true
          : filter === "assigned"
            ? row.status === "assigned" || row.status === "split"
            : row.status === "unseated";
      const matchesGroupFilter =
        groupFilter === "all"
          ? true
          : memberMeta.some(({ effectiveGroup }) =>
              groupFilter === "ungrouped"
                ? effectiveGroup === null
                : effectiveGroup?.id === groupFilter,
            );
      const matchesTableFilter =
        tableFilter === "all"
          ? true
          : memberMeta.some(({ assignedTableId }) =>
              tableFilter === "unassigned"
                ? assignedTableId === null
                : assignedTableId === tableFilter,
            );
      const matchesQuery =
        queryLower.length === 0
          ? true
          : memberMeta.some(({ guest, effectiveGroup, assignedTableId }) => {
              return (
                guest.name.toLowerCase().includes(queryLower) ||
                (effectiveGroup?.name ?? "").toLowerCase().includes(queryLower) ||
                (assignedTableId
                  ? (tableLabelById[assignedTableId] ?? "").toLowerCase()
                  : ""
                ).includes(queryLower)
              );
            });

      return (
        matchesStatusFilter &&
        matchesGroupFilter &&
        matchesTableFilter &&
        matchesQuery
      );
    });
  }, [allRows, filter, groupFilter, guestsById, query, tableFilter, tableLabelById]);
  const visibleGuestCount = useMemo(
    () => visibleRows.reduce((count, row) => count + getRowGuestCount(row), 0),
    [visibleRows],
  );

  const togglePairExpanded = (rowId: string) => {
    setExpandedPairRowIds((current) =>
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId],
    );
  };

  const getPairStatusBadgeClassName = (status: PairRowStatus) => {
    if (status === "assigned") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "split") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-zinc-200 bg-zinc-100 text-zinc-600";
  };

  const totalGuests = guests.length;
  const seatedGuests = guests.filter((guest) => guest.assignment !== null).length;

  const handleCreateGuest = async () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onCreateGuest({
        name: trimmed,
        groupId: newGuestGroupId.trim() ? newGuestGroupId : null,
        notes: newGuestNotes.trim() ? newGuestNotes.trim() : undefined,
      });
      setNewGuestName("");
      setNewGuestGroupId("");
      setNewGuestNotes("");
      setIsAddGuestDialogOpen(false);
    } catch {
      // Parent surface renders actionable guest errors.
    } finally {
      setIsSubmitting(false);
    }
  };

  const rootClassName =
    variant === "sheet"
      ? "flex min-h-0 w-full flex-1 flex-col bg-zinc-50"
      : "order-2 flex min-h-0 w-full flex-col border-t border-zinc-200 bg-zinc-50 lg:order-1 lg:h-full lg:w-[360px] lg:shrink-0 lg:border-r lg:border-t-0";

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
      setNewRelationshipType(LINKING_DEFAULTS.type);
      setNewRelationshipName(LINKING_DEFAULTS.name);
      setNewRelationshipPreferredSeating(LINKING_DEFAULTS.preferredSeating);
      setNewRelationshipMoveTogetherDefault(LINKING_DEFAULTS.moveTogetherDefault);
      setNewRelationshipStrict(LINKING_DEFAULTS.strict);
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
  const showAddRow = showQuickAdd ?? variant !== "desktop";
  const renderGuestSingleRow = (guest: Guest, options?: { compact?: boolean }) => {
    const compact = options?.compact ?? false;
    const guestRelationships = relationshipsByGuestId[guest.id] ?? [];
    const isSelectedForRelationship = selectedRelationshipGuestIds.includes(guest.id);
    const isSelectedGuestRow = selectedGuestId === guest.id;
    const effectiveGroup = resolveEffectiveGuestGroup(guest, guestsById);
    const canStartLinking = !isLinkingMode && guestRelationships.length === 0;

    return (
      <div className={`flex min-w-0 items-center gap-1 ${compact ? "" : "mb-1"}`}>
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
          className={`relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-md border px-3 text-left ${
            compact ? "py-1.5" : "py-2"
          } ${
            isSelectedForRelationship
              ? "border-blue-300 bg-blue-50/70"
              : isSelectedGuestRow
                ? "border-zinc-400 bg-zinc-100"
                : "border-transparent hover:border-zinc-200 hover:bg-zinc-100/70"
          }`}
        >
          {effectiveGroup?.color ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 h-full w-1"
              style={{ backgroundColor: effectiveGroup.color }}
            />
          ) : null}
          <Avatar>
            <AvatarFallback>{getInitials(guest.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">{guest.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {guest.assignment
                ? `${tableLabelById[guest.assignment.tableId] ?? t("guestPanel.tableFallback")} • ${t("guestPanel.seat", { seat: guest.assignment.seatNumber })} • ${t("guestPanel.assigned")}`
                : t("guestPanel.unseated")}
            </p>
            {guestRelationships.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {guestRelationships.map((relationship) => (
                  <Badge key={relationship.id} variant="secondary" className="text-[10px]">
                    {relationship.name?.trim().length
                      ? relationship.name
                      : relationshipTypeLabel[relationship.type]}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </button>
        {canStartLinking ? (
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="size-8 shrink-0 p-0"
                  aria-label={t("guestPanel.startLinking")}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectGuest(null);
                    onGuestSelected?.(null);
                    setSelectedRelationshipGuestIds([guest.id]);
                  }}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("guestPanel.link")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    );
  };

  return (
    <aside className={rootClassName}>
      {showHeader ? (
        <>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-zinc-900">{t("guestPanel.title")}</h2>
              {variant === "desktop" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="size-8 p-0"
                    aria-label={t("guestPanel.addGuest")}
                    onClick={() => setIsAddGuestDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="size-8 p-0"
                        aria-label={t("editor.more")}
                      >
                        <Ellipsis className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                      <p className="px-2 py-1 text-sm font-semibold text-zinc-900">{t("editor.more")}</p>
                      <DropdownMenuItem onClick={onOpenDataTools} className="gap-2">
                        <Upload className="h-4 w-4" />
                        {t("guestPanel.importCsv")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onExportGuests} className="gap-2">
                        <Download className="h-4 w-4" />
                        {t("guestPanel.exportCsv")}
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={onOpenGroupsManager} className="gap-2">
                        <Users className="h-4 w-4" />
                        {t("guestPanel.manageGroups")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onOpenLegend} className="gap-2">
                        <Shapes className="h-4 w-4" />
                        {t("editor.legend")}
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
                        <Settings className="h-4 w-4" />
                        {t("editor.settings")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}
            </div>
            {variant === "desktop" ? (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-zinc-500">{t("guestPanel.guestsCount", { count: totalGuests })}</span>
                <Badge variant="secondary">
                  {t("guestPanel.seatedCount", { count: seatedGuests })}
                </Badge>
              </div>
            ) : null}
          </div>
          <DialogPrimitive.Root open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/30" />
              <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[71] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                  <DialogPrimitive.Title className="text-xl font-semibold text-zinc-900">
                    {t("guestPanel.addGuest")}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("common.close")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                    <label className="text-sm font-medium text-zinc-700">{t("guestPanel.name")}</label>
                    <Input
                      value={newGuestName}
                      onChange={(event) => setNewGuestName(event.target.value)}
                      placeholder={t("guestPanel.fullNamePlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                    <label className="text-sm font-medium text-zinc-700">{t("guestPanel.group")}</label>
                    <select
                      className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                      value={newGuestGroupId}
                      onChange={(event) => setNewGuestGroupId(event.target.value)}
                    >
                      <option value="">{t("guestPanel.selectGroupPlaceholder")}</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start">
                    <label className="pt-2 text-sm font-medium text-zinc-700">{t("guestPanel.notesOptional")}</label>
                    <textarea
                      value={newGuestNotes}
                      onChange={(event) => setNewGuestNotes(event.target.value)}
                      placeholder={t("guestPanel.notesPlaceholder")}
                      className="min-h-24 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddGuestDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" onClick={handleCreateGuest} disabled={isSubmitting}>
                    {t("guestPanel.addGuest")}
                  </Button>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <Separator />
        </>
      ) : null}
      {showAddRow ? <Separator /> : null}
      {showAddRow ? (
        <div className="px-4 py-4">
          <div className="flex gap-2">
            <Input
              value={newGuestName}
              onChange={(event) => setNewGuestName(event.target.value)}
              placeholder={t("guestPanel.addGuestPlaceholder")}
            />
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleCreateGuest()}
            >
              {t("common.add")}
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={`shrink-0 px-4 ${variant === "sheet" ? "space-y-2 py-3" : "space-y-3 py-4"}`}
      >
        {variant === "desktop" ? (
          <p className="text-sm font-semibold text-zinc-900">{t("guestPanel.guestList")}</p>
        ) : null}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("guestPanel.searchPlaceholder")}
          className={variant === "sheet" ? "h-10" : undefined}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full" aria-label={t("guestPanel.filterByGroupLabel")}>
              <SelectValue placeholder={t("guestPanel.filterByGroupLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("guestPanel.filterGroupAll")}</SelectItem>
                <SelectItem value="ungrouped">{t("guestPanel.filterGroupUngrouped")}</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full" aria-label={t("guestPanel.filterByTableLabel")}>
              <SelectValue placeholder={t("guestPanel.filterByTableLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("guestPanel.filterTableAll")}</SelectItem>
                <SelectItem value="unassigned">{t("guestPanel.filterTableUnassigned")}</SelectItem>
                {tableFilterOptions.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
          {(["all", "unseated", "assigned"] as const).map((next) => (
            <Button
              key={next}
              type="button"
              size="sm"
              variant={filter === next ? "default" : "outline"}
              className={variant === "sheet" ? "h-8 px-3" : undefined}
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
          {variant === "sheet" ? (
            <span className="text-xs text-zinc-500">
              {visibleGuestCount}/{totalGuestCount}
            </span>
          ) : null}
        </div>
        {variant === "desktop" || query.trim().length > 0 ? (
          <p className="text-xs text-zinc-500">
            {t("guestPanel.showing", { count: visibleGuestCount, total: totalGuestCount })}
          </p>
        ) : null}
      </div>

      {error ? <div className="px-4 pb-3 text-xs text-red-700">{error}</div> : null}

      <div className="min-h-0 flex-1 border-t border-zinc-200">
        <ScrollArea className="h-full">
          {isLoading ? (
            <p className="p-4 text-sm text-zinc-600">{t("guestPanel.loading")}</p>
          ) : visibleRows.length === 0 ? (
            <p className="p-4 text-sm text-zinc-600">{t("guestPanel.empty")}</p>
          ) : (
            <ul className="p-2">
              {visibleRows.map((row) => {
                if (row.kind === "single") {
                  return <li key={row.key}>{renderGuestSingleRow(row.guest)}</li>;
                }

                const [firstGuest, secondGuest] = row.guests;
                const isExpanded = expandedPairRowIds.includes(row.key);
                const isSelectedForRelationship =
                  selectedRelationshipGuestIds.includes(firstGuest.id) ||
                  selectedRelationshipGuestIds.includes(secondGuest.id);
                const isSelectedGuestRow =
                  selectedGuestId === firstGuest.id || selectedGuestId === secondGuest.id;
                const pairCombinedName = t("guestPanel.pairCombinedName", {
                  first: firstGuest.name,
                  second: secondGuest.name,
                });
                const firstEffectiveGroup = resolveEffectiveGuestGroup(firstGuest, guestsById);
                const secondEffectiveGroup = resolveEffectiveGuestGroup(secondGuest, guestsById);
                const sameGroupColor =
                  firstEffectiveGroup?.color &&
                  secondEffectiveGroup?.color &&
                  firstEffectiveGroup.color === secondEffectiveGroup.color
                    ? firstEffectiveGroup.color
                    : null;
                const firstAccentColor = sameGroupColor ?? firstEffectiveGroup?.color ?? null;
                const secondAccentColor = sameGroupColor ?? secondEffectiveGroup?.color ?? null;
                const pairStatusLabel =
                  row.status === "split"
                    ? t("guestPanel.split")
                    : row.status === "assigned"
                      ? t("guestPanel.assigned")
                      : t("guestPanel.unseated");

                return (
                  <li key={row.key}>
                    <div className="mb-1 space-y-1">
                      <button
                        type="button"
                        draggable={variant === "desktop" && enableGuestDnD}
                        onDragStart={(event) => {
                          if (!(variant === "desktop" && enableGuestDnD)) return;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", firstGuest.id);
                          const preview = createGuestDragPreview(pairCombinedName);
                          event.dataTransfer.setDragImage(preview, 18, 18);
                          requestAnimationFrame(() => {
                            preview.remove();
                          });
                          onGuestDragStart?.(firstGuest.id);
                        }}
                        onDragEnd={() => {
                          if (!(variant === "desktop" && enableGuestDnD)) return;
                          onGuestDragEnd?.();
                        }}
                        onClick={() => togglePairExpanded(row.key)}
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? t("guestPanel.pairCollapse")
                            : t("guestPanel.pairExpand")
                        }
                        className={`relative flex w-full min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left ${
                          isSelectedForRelationship
                            ? "border-blue-300 bg-blue-50/70"
                            : isSelectedGuestRow
                              ? "border-zinc-400 bg-zinc-100"
                              : "border-transparent hover:border-zinc-200 hover:bg-zinc-100/70"
                        }`}
                      >
                        {firstAccentColor || secondAccentColor ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-full w-1 overflow-hidden rounded-l-md"
                          >
                            {sameGroupColor ? (
                              <span
                                className="block h-full w-full"
                                style={{ backgroundColor: sameGroupColor }}
                              />
                            ) : (
                              <>
                                <span
                                  className="block h-1/2 w-full"
                                  style={{ backgroundColor: firstAccentColor ?? "transparent" }}
                                />
                                <span
                                  className="block h-1/2 w-full"
                                  style={{ backgroundColor: secondAccentColor ?? "#e4e4e7" }}
                                />
                              </>
                            )}
                          </span>
                        ) : null}
                        <div className="-space-x-2 flex shrink-0">
                          <Avatar className="h-8 w-8 border border-zinc-200 bg-white">
                            <AvatarFallback>{getInitials(firstGuest.name)}</AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 border border-zinc-200 bg-white">
                            <AvatarFallback>{getInitials(secondGuest.name)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="overflow-hidden text-sm font-medium leading-tight text-zinc-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {pairCombinedName}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className={`max-w-full truncate text-[10px] ${getPairStatusBadgeClassName(row.status)}`}
                            >
                              {pairStatusLabel}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      {isExpanded ? (
                        <div className="ml-5 space-y-1 border-l border-zinc-200 pl-3">
                          {renderGuestSingleRow(firstGuest, { compact: true })}
                          {renderGuestSingleRow(secondGuest, { compact: true })}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      {isLinkingMode ? (
        <div className="shrink-0 border-t border-zinc-200 px-4 py-3">
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
                onCheckedChange={(checked) => setNewRelationshipStrict(checked === true)}
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
              onClick={() => {
                setSelectedRelationshipGuestIds([]);
                setNewRelationshipType(LINKING_DEFAULTS.type);
                setNewRelationshipName(LINKING_DEFAULTS.name);
                setNewRelationshipPreferredSeating(LINKING_DEFAULTS.preferredSeating);
                setNewRelationshipMoveTogetherDefault(
                  LINKING_DEFAULTS.moveTogetherDefault,
                );
                setNewRelationshipStrict(LINKING_DEFAULTS.strict);
              }}
            >
              {t("guestPanel.clear")}
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
