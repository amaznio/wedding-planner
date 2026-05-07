import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/i18n/provider";
import { RotateCw } from "lucide-react";
import type {
  PreferredSeating,
  RelationshipType,
  SeatingRelationship,
} from "../types/relationship.types";
import type { SeatingTable } from "../types/seating-plan.types";

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
  relationships: SeatingRelationship[];
  guestForm: { name: string; group: string; notes: string };
  selectedTable: SeatingTable | null;
  selectedSeatGuest: Guest | null;
  tableLabelById?: Record<string, string>;
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
  onGuestFormChange: (next: { name: string; group: string; notes: string }) => void;
  onUpdateGuest: (
    guestId: string,
    payload: { name: string; group: string; notes: string },
  ) => Promise<void>;
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
  side?: "right" | "bottom";
  showOverlay?: boolean;
};

export function InspectorPanel({
  selection,
  isOpen,
  selectedGuest,
  guests,
  relationships,
  guestForm,
  selectedTable,
  selectedSeatGuest,
  tableLabelById = {},
  onClose,
  onSelectTable,
  onGuestFormChange,
  onUpdateGuest,
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
  side = "right",
  showOverlay = false,
}: InspectorPanelProps) {
  const { t } = useI18n();
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(
    null,
  );
  const [editingRelationshipName, setEditingRelationshipName] = useState("");
  const [isPlusOneSubmitting, setIsPlusOneSubmitting] = useState(false);

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
  const inspectorBody = (
    <div className="flex flex-col">
      {!isMobileDrawer ? (
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">{t("inspector.title")}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
          <Separator />
        </>
      ) : null}
      <div className={contentAreaClassName}>
          {!selection ? (
            <p className="text-sm text-zinc-600">{t("inspector.selectPrompt")}</p>
          ) : null}

          {selection?.type === "guest" && selectedGuest ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{selectedGuest.name}</p>
                {selectedGuest.assignment ? (
                  <Badge variant="secondary" className="mt-1">
                    {tableLabelById[selectedGuest.assignment.tableId] ?? t("guestPanel.tableFallback")} •{" "}
                    {t("guestPanel.seat", { seat: selectedGuest.assignment.seatNumber })}
                  </Badge>
                ) : (
                  <Badge className="mt-1">{t("inspector.unassigned")}</Badge>
                )}
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("guestPanel.name")}</span>
                <Input
                  value={guestForm.name}
                  onChange={(event) =>
                    onGuestFormChange({ ...guestForm, name: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("guestPanel.group")}</span>
                <Input
                  value={guestForm.group}
                  onChange={(event) =>
                    onGuestFormChange({ ...guestForm, group: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">{t("guestPanel.notes")}</span>
                <textarea
                  value={guestForm.notes}
                  onChange={(event) =>
                    onGuestFormChange({ ...guestForm, notes: event.target.value })
                  }
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void onUpdateGuest(selectedGuest.id, {
                      name: guestForm.name,
                      group: guestForm.group,
                      notes: guestForm.notes,
                    })
                  }
                >
                  {t("guestPanel.saveGuest")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void onDeleteGuest(selectedGuest.id)}
                >
                  {t("common.delete")}
                </Button>
              </div>
              {selectedGuest.assignment ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void onUnassignGuest(selectedGuest.assignment!.id, selectedGuest.id)
                  }
                >
                  {t("guestPanel.unassign")}
                </Button>
              ) : null}
              {!selectedGuest.isPlaceholderPlusOne ? (
                selectedGuestPlusOneRelationship &&
                selectedGuestPlusOneGuest?.isPlaceholderPlusOne &&
                selectedGuestPlusOneGuest.plusOneHostGuestId === selectedGuest.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPlusOneSubmitting}
                    onClick={() => {
                      setIsPlusOneSubmitting(true);
                      void onRemovePlusOne(selectedGuest.id).finally(() => {
                        setIsPlusOneSubmitting(false);
                      });
                    }}
                  >
                    {t("guestPanel.removePlusOne")}
                  </Button>
                ) : !selectedGuestPlusOneRelationship ? (
                  <Button
                    type="button"
                    variant="outline"
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onStartLinking(selectedGuest.id)}
              >
                {t("guestPanel.startLinking")}
              </Button>
              <div className="space-y-2 rounded-md border border-zinc-200 bg-white p-2">
                <p className="text-xs font-semibold text-zinc-800">
                  {t("guestPanel.relationshipsForSelected")}
                </p>
                {selectedGuestRelationships.length === 0 ? (
                  <p className="text-xs text-zinc-500">{t("guestPanel.noRelationships")}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedGuestRelationships.map((relationship) => (
                      <div
                        key={relationship.id}
                        className="rounded-md border border-zinc-200 bg-white p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-zinc-900">
                            {relationship.name?.trim().length
                              ? relationship.name
                              : relationshipTypeLabel[relationship.type]}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingRelationshipId(relationship.id);
                              setEditingRelationshipName(relationship.name ?? "");
                            }}
                          >
                            {t("guestPanel.rename")}
                          </Button>
                        </div>
                        <p className="text-[11px] text-zinc-600">
                          {relationshipTypeLabel[relationship.type]} •{" "}
                          {preferredSeatingLabel[relationship.preferredSeating]} •{" "}
                          {t("guestPanel.guestsCount", { count: relationship.guestIds.length })}
                        </p>
                        <div className="mt-2 flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
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
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
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
                            className="h-6 px-2 text-[11px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onDeleteRelationship(relationship.id);
                            }}
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                        {editingRelationshipId === relationship.id ? (
                          <div className="mt-2 flex gap-2">
                            <Input
                              className="h-7 text-xs"
                              value={editingRelationshipName}
                              onChange={(event) =>
                                setEditingRelationshipName(event.target.value)
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs"
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
              </div>
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
                <Button variant="destructive" onClick={onDeleteTable}>
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
        className="h-full w-[340px] p-0 sm:max-w-[340px]"
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
