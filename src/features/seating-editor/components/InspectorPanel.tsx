import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/provider";
import { ChevronLeft, EllipsisVertical, RotateCw } from "lucide-react";
import type {
  PreferredSeating,
  RelationshipType,
  SeatingRelationship,
} from "../types/relationship.types";
import type { SeatingTable } from "../types/seating-plan.types";

type Guest = {
  id: string;
  name: string;
  sex: "male" | "female" | "unknown";
  ageCategory: "adult" | "teen" | "child" | "small_child" | "toddler_0_2";
  groupId: string | null;
  plannedTableId: string | null;
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

type GuestGroup = {
  id: string;
  planId: string;
  name: string;
  color: string;
  guestCount: number;
};

type Selection =
  | { type: "guest"; guestId: string }
  | { type: "table"; tableId: string }
  | { type: "seat"; tableId: string; seatNumber: number }
  | null;

type InspectorPanelProps = {
  selection: Selection;
  isOpen: boolean;
  selectedGuest: Guest | null;
  guests: Guest[];
  groups: GuestGroup[];
  relationships: SeatingRelationship[];
  guestForm: {
    name: string;
    sex: "male" | "female" | "unknown";
    ageCategory: "adult" | "teen" | "child" | "small_child" | "toddler_0_2";
    groupId: string | null;
    notes: string;
  };
  selectedTable: SeatingTable | null;
  selectedSeatGuest: Guest | null;
  tableLabelById?: Record<string, string>;
  onClose: () => void;
  onBackToGuestList?: () => void;
  onSelectTable: (tableId: string) => void;
  onGuestFormChange: (next: {
    name: string;
    sex: "male" | "female" | "unknown";
    ageCategory: "adult" | "teen" | "child" | "small_child" | "toddler_0_2";
    groupId: string | null;
    notes: string;
  }) => void;
  onUpdateGuest: (
    guestId: string,
    payload: {
      name: string;
      sex: "male" | "female" | "unknown";
      ageCategory: "adult" | "teen" | "child" | "small_child" | "toddler_0_2";
      groupId: string | null;
      notes: string;
      plannedTableId?: string | null;
    },
  ) => Promise<void>;
  onCreateGroup: (name: string) => Promise<GuestGroup>;
  onDeleteGuest: (guestId: string) => Promise<void>;
  onUnassignGuest: (assignmentId: string, guestId: string) => Promise<void>;
  onUpdateRelationship: (
    relationshipId: string,
    payload: Partial<{
      type: RelationshipType;
      name: string | null;
      preferredSeating: PreferredSeating;
      moveTogetherDefault: boolean;
      strict: boolean;
    }>,
  ) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onAddPlusOne: (guestId: string, placeholderName: string) => Promise<void>;
  onRemovePlusOne: (guestId: string) => Promise<void>;
  onStartLinking: (guestId: string) => void;
  onTableLabelChange: (label: string) => void;
  onTableSeatCountChange: (seatCount: number) => void;
  onTableSeatLayoutChange: (seatLayout: "balanced" | "top-only" | "bottom-only") => void;
  onRotateTable: () => void;
  onDeleteTable: () => void;
  onAutoSeatTable: (tableId: string) => Promise<void>;
  side?: "right" | "bottom";
  showOverlay?: boolean;
};

type ConfirmAction = {
  title: string;
  description?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<void>;
};

export function InspectorPanel({
  selection,
  isOpen,
  selectedGuest,
  guests,
  groups,
  relationships,
  guestForm,
  selectedTable,
  selectedSeatGuest,
  tableLabelById = {},
  onClose,
  onBackToGuestList,
  onSelectTable,
  onGuestFormChange,
  onUpdateGuest,
  onCreateGroup,
  onDeleteGuest,
  onUnassignGuest,
  onUpdateRelationship,
  onDeleteRelationship,
  onAddPlusOne,
  onRemovePlusOne,
  onStartLinking,
  onTableLabelChange,
  onTableSeatCountChange,
  onTableSeatLayoutChange,
  onRotateTable,
  onDeleteTable,
  onAutoSeatTable,
  side = "right",
  showOverlay = false,
}: InspectorPanelProps) {
  const { t } = useI18n();
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(
    null,
  );
  const [editingRelationshipName, setEditingRelationshipName] = useState("");
  const [isPlusOneSubmitting, setIsPlusOneSubmitting] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupActionError, setGroupActionError] = useState<string | null>(null);
  const [isAutoSeating, setIsAutoSeating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const relationshipTypeLabel: Record<RelationshipType, string> = {
    couple: t("guestPanel.relationshipType.couple"),
    family: t("guestPanel.relationshipType.family"),
    group: t("guestPanel.relationshipType.group"),
    custom: t("guestPanel.relationshipType.custom"),
    plus_one: t("guestPanel.relationshipType.plus_one"),
  };
  const preferredSeatingLabel: Record<PreferredSeating, string> = {
    none: t("guestPanel.preferredSeating.none"),
    adjacent: t("guestPanel.preferredSeating.adjacent"),
    nearby: t("guestPanel.preferredSeating.nearby"),
    "same-table": t("guestPanel.preferredSeating.same-table"),
  };

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

  const selectedGuestRelationships = selectedGuest
    ? relationshipsByGuestId[selectedGuest.id] ?? []
    : [];
  const hasNonPlusOneRelationship = selectedGuestRelationships.some(
    (relationship) => relationship.type !== "plus_one",
  );
  const selectedGuestPlusOneRelationship =
    selectedGuestRelationships.find((relationship) => relationship.type === "plus_one") ?? null;
  const selectedGuestPlusOneGuest =
    selectedGuest && selectedGuestPlusOneRelationship
      ? (guests.find(
          (guest) =>
            guest.id !== selectedGuest.id &&
            selectedGuestPlusOneRelationship.guestIds.includes(guest.id),
        ) ?? null)
      : null;

  const isMobileDrawer = side === "bottom";
  const contentAreaClassName = "flex-1 overflow-auto p-4";
  const showBackAction =
    isMobileDrawer && selection?.type === "guest" && Boolean(onBackToGuestList);
  const showMoreActionsMenu = selection?.type === "guest" && selectedGuest !== null;
  const hasHeaderActions = showBackAction || showMoreActionsMenu;
  const inspectorBody = (
    <div className="flex flex-col">
      {hasHeaderActions ? (
        <div className="flex items-center gap-2 px-4 py-3">
          {showBackAction ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onBackToGuestList}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t("inspector.backToGuests")}
            </Button>
          ) : null}
          {showMoreActionsMenu && selectedGuest ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label={t("inspector.moreActions")}
                >
                  <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-700 focus:text-red-700"
                  onClick={() =>
                    setConfirmAction({
                      title: t("inspector.confirmDeleteGuestTitle"),
                      description: t("inspector.confirmDeleteGuestDescription", {
                        name: selectedGuest.name,
                      }),
                      onConfirm: () => onDeleteGuest(selectedGuest.id),
                    })
                  }
                >
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}
      {hasHeaderActions ? <Separator /> : null}
      <div className={contentAreaClassName}>
          {!selection ? (
            <p className="text-sm text-zinc-600">{t("inspector.selectPrompt")}</p>
          ) : null}

          {selection?.type === "guest" && selectedGuest ? (
            <div>
              <div>
                <p className="text-[22px] font-semibold leading-tight text-zinc-900">
                  {selectedGuest.name}
                </p>
                {selectedGuest.assignment ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">
                      {tableLabelById[selectedGuest.assignment.tableId] ?? t("guestPanel.tableFallback")} •{" "}
                      {t("guestPanel.seat", { seat: selectedGuest.assignment.seatNumber })}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() =>
                        setConfirmAction({
                          title: t("inspector.confirmUnassignGuestTitle"),
                          description: t("inspector.confirmUnassignGuestDescription"),
                          confirmVariant: "default",
                          onConfirm: () =>
                            onUnassignGuest(selectedGuest.assignment!.id, selectedGuest.id),
                        })
                      }
                    >
                      {t("guestPanel.unassign")}
                    </Button>
                  </div>
                ) : (
                  <Badge className="mt-2">{t("inspector.unassigned")}</Badge>
                )}
              </div>

              <Separator className="my-4" />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("guestPanel.guestDetails")}
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{t("guestPanel.name")}</span>
                  <Input
                    value={guestForm.name}
                    onChange={(event) =>
                      onGuestFormChange({ ...guestForm, name: event.target.value })
                    }
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{t("guestPanel.group")}</span>
                  <select
                    value={guestForm.groupId ?? ""}
                    onChange={(event) =>
                      onGuestFormChange({
                        ...guestForm,
                        groupId: event.target.value || null,
                      })
                    }
                    className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="">{t("guestPanel.noGroup")}</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{t("guestPanel.sex")}</span>
                  <select
                    value={guestForm.sex}
                    onChange={(event) =>
                      onGuestFormChange({
                        ...guestForm,
                        sex: event.target.value as "male" | "female" | "unknown",
                      })
                    }
                    className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="male">{t("guestPanel.sexMale")}</option>
                    <option value="female">{t("guestPanel.sexFemale")}</option>
                    <option value="unknown">{t("guestPanel.sexUnknown")}</option>
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{t("guestPanel.ageCategory")}</span>
                  <select
                    value={guestForm.ageCategory}
                    onChange={(event) =>
                      onGuestFormChange({
                        ...guestForm,
                        ageCategory: event.target.value as "adult" | "teen" | "child" | "small_child" | "toddler_0_2",
                      })
                    }
                    className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  >
                    <option value="adult">{t("guestPanel.ageCategoryAdult")}</option>
                    <option value="teen">{t("guestPanel.ageCategoryTeen")}</option>
                    <option value="child">{t("guestPanel.ageCategoryChild")}</option>
                    <option value="small_child">{t("guestPanel.ageCategorySmallChild")}</option>
                    <option value="toddler_0_2">{t("guestPanel.ageCategoryToddler")}</option>
                  </select>
                </label>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    {t("guestPanel.createGroupInline")}
                  </span>
                  <div className="flex gap-2">
                    <Input
                      value={newGroupName}
                      onChange={(event) => setNewGroupName(event.target.value)}
                      placeholder={t("guestPanel.addGroupPlaceholder")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isGroupSubmitting}
                      onClick={async () => {
                        const trimmed = newGroupName.trim();
                        if (!trimmed) return;
                        setGroupActionError(null);
                        setIsGroupSubmitting(true);
                        try {
                          const created = await onCreateGroup(trimmed);
                          onGuestFormChange({ ...guestForm, groupId: created.id });
                          setNewGroupName("");
                        } catch (error) {
                          setGroupActionError(
                            error instanceof Error
                              ? error.message
                              : t("guestPanel.groupCreateFailed"),
                          );
                        } finally {
                          setIsGroupSubmitting(false);
                        }
                      }}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  {groupActionError ? (
                    <p className="text-xs text-red-700">{groupActionError}</p>
                  ) : null}
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{t("guestPanel.notes")}</span>
                  <textarea
                    value={guestForm.notes}
                    onChange={(event) =>
                      onGuestFormChange({ ...guestForm, notes: event.target.value })
                    }
                    rows={4}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  />
                </label>
              </section>

              <Separator className="my-4" />

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("inspector.actions")}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    void onUpdateGuest(selectedGuest.id, {
                      name: guestForm.name,
                      sex: guestForm.sex,
                      ageCategory: guestForm.ageCategory,
                      groupId: guestForm.groupId,
                      notes: guestForm.notes,
                    })
                  }
                >
                  {t("guestPanel.saveGuest")}
                </Button>
                {!selectedGuest.isPlaceholderPlusOne ? (
                  selectedGuestPlusOneRelationship &&
                  selectedGuestPlusOneGuest?.isPlaceholderPlusOne &&
                  selectedGuestPlusOneGuest.plusOneHostGuestId === selectedGuest.id ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isPlusOneSubmitting}
                      onClick={() =>
                        setConfirmAction({
                          title: t("inspector.confirmRemovePlusOneTitle"),
                          description: t("inspector.confirmRemovePlusOneDescription"),
                          confirmVariant: "default",
                          onConfirm: async () => {
                            setIsPlusOneSubmitting(true);
                            try {
                              await onRemovePlusOne(selectedGuest.id);
                            } finally {
                              setIsPlusOneSubmitting(false);
                            }
                          },
                        })
                      }
                    >
                      {t("guestPanel.removePlusOne")}
                    </Button>
                    ) : !selectedGuestPlusOneRelationship &&
                        !hasNonPlusOneRelationship ? (
                      <Button
                        type="button"
                        variant="outline"
                      className="w-full"
                      disabled={isPlusOneSubmitting}
                      onClick={() => {
                        setIsPlusOneSubmitting(true);
                        void onAddPlusOne(
                          selectedGuest.id,
                          t("guestPanel.plusOnePlaceholderName"),
                        ).finally(() => {
                          setIsPlusOneSubmitting(false);
                        });
                      }}
                    >
                      {t("guestPanel.addPlusOne")}
                    </Button>
                  ) : null
                ) : null}
              </section>

              {selectedGuestRelationships.length === 0 ? (
                <>
                  <Separator className="my-4" />

                  <section className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("inspector.linking")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => onStartLinking(selectedGuest.id)}
                    >
                      {t("guestPanel.startLinking")}
                    </Button>
                  </section>
                </>
              ) : null}

              <Separator className="my-4" />

              <section className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("guestPanel.relationshipsForSelected")}
                </p>
                {selectedGuestRelationships.length === 0 ? (
                  <p className="text-xs text-zinc-500">{t("guestPanel.noRelationships")}</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedGuestRelationships.map((relationship) => (
                      <div key={relationship.id} className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {relationship.name?.trim().length
                                ? relationship.name
                                : relationshipTypeLabel[relationship.type]}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Badge variant="default" className="text-[10px]">
                                {relationshipTypeLabel[relationship.type]}
                              </Badge>
                              <span className="truncate text-[11px] text-zinc-600">
                                {preferredSeatingLabel[relationship.preferredSeating]} •{" "}
                                {t("guestPanel.guestsCount", { count: relationship.guestIds.length })}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingRelationshipId(relationship.id);
                              setEditingRelationshipName(relationship.name ?? "");
                            }}
                          >
                            {t("guestPanel.rename")}
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={relationship.moveTogetherDefault ? "default" : "outline"}
                            className="h-7 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onUpdateRelationship(relationship.id, {
                                moveTogetherDefault: !relationship.moveTogetherDefault,
                              });
                            }}
                          >
                            {t("guestPanel.moveTogether", {
                              value: relationship.moveTogetherDefault
                                ? t("guestPanel.on")
                                : t("guestPanel.off"),
                            })}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={relationship.strict ? "default" : "outline"}
                            className="h-7 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onUpdateRelationship(relationship.id, {
                                strict: !relationship.strict,
                              });
                            }}
                          >
                            {t("guestPanel.strictLabel", {
                              value: relationship.strict
                                ? t("guestPanel.on")
                                : t("guestPanel.off"),
                            })}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="ml-auto h-7 px-2 text-[11px]"
                            onClick={() => {
                              const relationshipLabel =
                                relationship.name?.trim().length
                                  ? relationship.name
                                  : relationshipTypeLabel[relationship.type];
                              setConfirmAction({
                                title: t("inspector.confirmDeleteRelationshipTitle"),
                                description: t("inspector.confirmDeleteRelationshipDescription", {
                                  name: relationshipLabel,
                                }),
                                onConfirm: () => onDeleteRelationship(relationship.id),
                              });
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                        {editingRelationshipId === relationship.id ? (
                          <div className="mt-2 flex gap-2">
                            <Input
                              className="h-8 text-xs"
                              value={editingRelationshipName}
                              onChange={(event) =>
                                setEditingRelationshipName(event.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onUpdateRelationship(relationship.id, {
                                  name: editingRelationshipName.trim() || null,
                                }).then(() => setEditingRelationshipId(null));
                              }}
                            >
                              {t("common.save")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          ) : null}

          {selection?.type === "table" && selectedTable ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900">{t("inspector.tableSettings")}</p>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("inspector.tableName")}</span>
                <Input
                  value={selectedTable.label}
                  onChange={(event) => onTableLabelChange(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("inspector.seatCount")}</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={selectedTable.seatCount}
                  onChange={(event) =>
                    onTableSeatCountChange(Number.parseInt(event.target.value, 10) || 1)
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("inspector.seatLayout")}</span>
                <select
                  value={selectedTable.seatLayout}
                  onChange={(event) =>
                    onTableSeatLayoutChange(
                      event.target.value as "balanced" | "top-only" | "bottom-only",
                    )
                  }
                  className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  <option value="balanced">{t("inspector.layoutBalanced")}</option>
                  <option value="top-only">{t("inspector.layoutTopOnly")}</option>
                  <option value="bottom-only">{t("inspector.layoutBottomOnly")}</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onRotateTable} className="gap-2">
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  {t("inspector.rotate")}
                </Button>
                <Button
                  variant="outline"
                  disabled={isAutoSeating}
                  onClick={async () => {
                    if (!selectedTable) return;
                    setIsAutoSeating(true);
                    try {
                      await onAutoSeatTable(selectedTable.id);
                    } finally {
                      setIsAutoSeating(false);
                    }
                  }}
                >
                  {isAutoSeating ? t("common.saving") : t("inspector.autoSeatTable")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    setConfirmAction({
                      title: t("inspector.confirmDeleteTableTitle"),
                      description: t("inspector.confirmDeleteTableDescription", {
                        name: selectedTable.label,
                      }),
                      onConfirm: async () => {
                        onDeleteTable();
                      },
                    })
                  }
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ) : null}

          {selection?.type === "seat" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900">
                {t("guestPanel.seat", { seat: selection.seatNumber })}
              </p>
              <p className="text-xs text-zinc-600">
                {tableLabelById[selection.tableId] ?? t("guestPanel.tableFallback")}
              </p>
              {selectedSeatGuest ? (
                <Badge variant="secondary">
                  {t("inspector.seatAssigned", { name: selectedSeatGuest.name })}
                </Badge>
              ) : (
                <Badge>{t("inspector.unassigned")}</Badge>
              )}
              <p className="text-xs text-zinc-600">
                {t("inspector.assignmentActionsInfo")}
              </p>
              <Button variant="outline" onClick={() => onSelectTable(selection.tableId)}>
                {t("inspector.goToTable")}
              </Button>
            </div>
          ) : null}
      </div>
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        confirmVariant={confirmAction?.confirmVariant ?? "destructive"}
        onConfirm={async () => {
          await confirmAction?.onConfirm();
        }}
      />
    </div>
  );

  if (side === "bottom") {
    const drawerContentClassName =
      selection?.type === "guest" ? "h-[92dvh] p-0" : "h-auto max-h-[56dvh] p-0";

    return (
      <Drawer open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <DrawerContent className={drawerContentClassName}>
          <DrawerTitle className="sr-only">{t("inspector.title")}</DrawerTitle>
          {inspectorBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet
      open={isOpen}
      modal={showOverlay}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
    >
      <SheetContent
        side={side}
        showOverlay={showOverlay}
        className="h-full w-[380px] p-0 sm:max-w-[380px]"
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
      >
        <SheetTitle className="sr-only">{t("inspector.title")}</SheetTitle>
        {inspectorBody}
      </SheetContent>
    </Sheet>
  );
}
