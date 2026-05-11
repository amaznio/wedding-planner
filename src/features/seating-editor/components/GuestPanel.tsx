import { useEffect, useMemo, useState } from "react";

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
  onCreateRelationship: (
    payload: RelationshipForm & { guestIds: string[] },
  ) => Promise<void>;
  variant?: "desktop" | "sheet";
  showHeader?: boolean;
  showQuickAdd?: boolean;
  onOpenGroupsManager?: () => void;
  onOpenDataTools?: () => void;
  onExportGuests?: () => void;
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
  onCreateRelationship,
  variant = "desktop",
  showHeader = true,
  showQuickAdd,
  onOpenGroupsManager,
  onOpenDataTools,
  onExportGuests,
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
  const [newGuestName, setNewGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            (guest.group?.name ?? "").toLowerCase().includes(queryLower);
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
  const guestsById = useMemo<Record<string, Guest>>(() => {
    return Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  }, [guests]);

  const totalGuests = guests.length;
  const seatedGuests = guests.filter((guest) => guest.assignment !== null).length;

  const handleCreateGuest = async () => {
    const trimmed = newGuestName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onCreateGuest(trimmed);
      setNewGuestName("");
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
  const showAddRow = showQuickAdd ?? variant === "desktop";

  return (
    <aside className={rootClassName}>
      {showHeader ? (
        <>
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">{t("guestPanel.title")}</h2>
              {variant === "desktop" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("editor.more")}>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <circle cx="6" cy="12" r="1.6" />
                        <circle cx="12" cy="12" r="1.6" />
                        <circle cx="18" cy="12" r="1.6" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onOpenGroupsManager}>
                      {t("guestPanel.manageGroups")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onOpenDataTools}>{t("guestPanel.import")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={onExportGuests}>{t("guestPanel.export")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            {showAddRow ? (
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
            ) : null}
          </div>
          <Separator />
        </>
      ) : null}

      <div
        className={`shrink-0 px-4 ${variant === "sheet" ? "space-y-2 py-3" : "space-y-3 py-4"}`}
      >
        {variant === "desktop" ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">{t("guestPanel.guestList")}</p>
            <Badge variant="secondary">
              {t("guestPanel.guestsSeated", { seated: seatedGuests, total: totalGuests })}
            </Badge>
          </div>
        ) : null}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("guestPanel.searchPlaceholder")}
          className={variant === "sheet" ? "h-10" : undefined}
        />
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
              {visibleGuests.length}/{totalGuests}
            </span>
          ) : null}
        </div>
        {variant === "desktop" || query.trim().length > 0 ? (
          <p className="text-xs text-zinc-500">
            {t("guestPanel.showing", { count: visibleGuests.length })}
          </p>
        ) : null}
      </div>

      {error ? <div className="px-4 pb-3 text-xs text-red-700">{error}</div> : null}

      <div className="min-h-0 flex-1 border-t border-zinc-200">
        <ScrollArea className="h-full">
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
                const effectiveGroup = resolveEffectiveGuestGroup(guest, guestsById);

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
                        className={`relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-md border px-3 py-2 text-left ${
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
