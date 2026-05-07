import { useMemo, useState, type ChangeEventHandler } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  selectedGuest: Guest | null;
  guestForm: { name: string; group: string; notes: string };
  tableLabelById: Record<string, string>;
  selectedGuestId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onCreateGuest: (name: string) => Promise<void>;
  onBulkCreateGuests: (
    guests: Array<{ name: string; group?: string; notes?: string }>,
  ) => Promise<void>;
  onUpdateGuest: (
    guestId: string,
    payload: { name: string; group: string; notes: string },
  ) => Promise<void>;
  onDeleteGuest: (guestId: string) => Promise<void>;
  onUnassignGuest: (assignmentId: string, guestId: string) => Promise<void>;
  onGuestFormChange: (next: { name: string; group: string; notes: string }) => void;
  onCreateRelationship: (
    payload: RelationshipForm & { guestIds: string[] },
  ) => Promise<void>;
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
  variant?: "desktop" | "sheet";
  onGuestSelected?: () => void;
  enableGuestDnD?: boolean;
  onGuestDragStart?: (guestId: string) => void;
  onGuestDragEnd?: () => void;
};

const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> = {
  couple: "Couple",
  family: "Family",
  group: "Group",
  custom: "Custom",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function getRelationshipDisplayName(relationship: SeatingRelationship): string {
  if (relationship.name && relationship.name.trim().length > 0) {
    return relationship.name;
  }
  return RELATIONSHIP_TYPE_LABEL[relationship.type];
}

export function GuestPanel({
  guests,
  relationships,
  selectedGuest,
  guestForm,
  tableLabelById,
  selectedGuestId,
  isLoading,
  error,
  onSelectGuest,
  onCreateGuest,
  onBulkCreateGuests,
  onUpdateGuest,
  onDeleteGuest,
  onUnassignGuest,
  onGuestFormChange,
  onCreateRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
  variant = "desktop",
  onGuestSelected,
  enableGuestDnD = false,
  onGuestDragStart,
  onGuestDragEnd,
}: GuestPanelProps) {
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
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(
    null,
  );
  const [editingRelationshipName, setEditingRelationshipName] = useState("");

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
    const normalized = text.replace(/\r?\n/g, ",");
    const values = normalized
      .split(",")
      .map((part) => part.trim().replace(/^"|"$/g, "").replaceAll("\"\"", "\""))
      .filter(Boolean);

    if (values.length === 0) {
      event.target.value = "";
      return;
    }

    const seen = new Set<string>(
      guests
        .map((guest) => guest.name.trim().toLowerCase())
        .filter((name) => name.length > 0),
    );
    const parsed = values
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((name) => ({ name }));

    if (parsed.length > 0) {
      await onBulkCreateGuests(parsed);
    }

    event.target.value = "";
  };

  const toggleRelationshipGuest = (guestId: string) => {
    setSelectedRelationshipGuestIds((current) => {
      if (current.includes(guestId)) {
        return current.filter((id) => id !== guestId);
      }
      return [...current, guestId];
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

  const selectedGuestRelationships = selectedGuestId
    ? relationshipsByGuestId[selectedGuestId] ?? []
    : [];

  return (
    <aside className={rootClassName}>
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Guests</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={newGuestName}
            onChange={(event) => setNewGuestName(event.target.value)}
            placeholder="Add guest"
          />
          <Button type="button" disabled={isSubmitting} onClick={handleCreateGuest}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex gap-2">
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" type="button">
              Import
            </Button>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
          </label>
          <Button type="button" size="sm" variant="outline" onClick={handleExportCsv}>
            Export
          </Button>
        </div>
      </div>
      <Separator />
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Guest list</p>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">
              Guests seated {seatedGuests}/{totalGuests}
            </Badge>
          </div>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guests"
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
              {next[0].toUpperCase() + next.slice(1)}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Showing {visibleGuests.length}</p>
      </div>
      {error ? <div className="px-4 pb-3 text-xs text-red-700">{error}</div> : null}
      <ScrollArea className="flex-1 border-t border-zinc-200">
        {isLoading ? (
          <p className="p-4 text-sm text-zinc-600">Loading guests...</p>
        ) : visibleGuests.length === 0 ? (
          <p className="p-4 text-sm text-zinc-600">No guests match this filter.</p>
        ) : (
          <ul className="p-2">
            {visibleGuests.map((guest) => {
              const guestRelationships = relationshipsByGuestId[guest.id] ?? [];
              const isSelectedForRelationship =
                selectedRelationshipGuestIds.includes(guest.id);

              return (
                <li key={guest.id}>
                  <div className="mb-1 flex items-center gap-1">
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
                        onSelectGuest(selectedGuestId === guest.id ? null : guest.id);
                        onGuestSelected?.();
                      }}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
                        selectedGuestId === guest.id
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
                            ? `${tableLabelById[guest.assignment.tableId] ?? "Table"} • Seat ${guest.assignment.seatNumber}`
                            : "Unseated"}
                        </p>
                        {guestRelationships.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {guestRelationships.map((relationship) => (
                              <Badge
                                key={relationship.id}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {getRelationshipDisplayName(relationship)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {guest.assignment ? (
                        <Badge variant="secondary">Assigned</Badge>
                      ) : (
                        <Badge>Unseated</Badge>
                      )}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelectedForRelationship ? "default" : "outline"}
                      className="h-8 px-2 text-[11px]"
                      onClick={() => toggleRelationshipGuest(guest.id)}
                    >
                      Link
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {selectedRelationshipGuestIds.length > 0 ? (
        <div className="border-t border-zinc-200 px-4 py-3">
          <p className="text-xs font-semibold text-zinc-800">
            Create relationship ({selectedRelationshipGuestIds.length} selected)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={newRelationshipType}
              onChange={(event) =>
                setNewRelationshipType(event.target.value as RelationshipType)
              }
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="couple">Couple</option>
              <option value="family">Family</option>
              <option value="group">Group</option>
              <option value="custom">Custom</option>
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
              <option value="none">No preference</option>
              <option value="adjacent">Adjacent</option>
              <option value="nearby">Nearby</option>
              <option value="same-table">Same table</option>
            </select>
          </div>
          <Input
            className="mt-2 h-9 text-xs"
            placeholder="Optional relationship name"
            value={newRelationshipName}
            onChange={(event) => setNewRelationshipName(event.target.value)}
          />
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-700">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={newRelationshipMoveTogetherDefault}
                onChange={(event) =>
                  setNewRelationshipMoveTogetherDefault(event.target.checked)
                }
              />
              Move together default
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={newRelationshipStrict}
                onChange={(event) => setNewRelationshipStrict(event.target.checked)}
              />
              Strict
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
              Create relationship
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setSelectedRelationshipGuestIds([])}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      {selectedGuestId ? (
        <div
          className="border-t border-zinc-200 px-4 py-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-xs font-semibold text-zinc-800">
            Relationships for selected guest
          </p>
          {selectedGuestRelationships.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">No relationships.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {selectedGuestRelationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="rounded-md border border-zinc-200 bg-white p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-zinc-900">
                      {getRelationshipDisplayName(relationship)}
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
                      Rename
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {RELATIONSHIP_TYPE_LABEL[relationship.type]} •{" "}
                    {relationship.preferredSeating} • {relationship.guestIds.length}{" "}
                    guests
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
                        if (selectedGuestId) {
                          onSelectGuest(selectedGuestId);
                        }
                      }}
                    >
                      MoveTogether: {relationship.moveTogetherDefault ? "On" : "Off"}
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
                        if (selectedGuestId) {
                          onSelectGuest(selectedGuestId);
                        }
                      }}
                    >
                      Strict: {relationship.strict ? "On" : "Off"}
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
                      Delete
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
                          if (selectedGuestId) {
                            onSelectGuest(selectedGuestId);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {selectedGuest ? (
        <div
          className="border-t border-zinc-200 px-4 py-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-xs font-semibold text-zinc-800">Guest details</p>
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{selectedGuest.name}</p>
              {selectedGuest.assignment ? (
                <Badge variant="secondary" className="mt-1">
                  {tableLabelById[selectedGuest.assignment.tableId] ?? "Table"} • Seat{" "}
                  {selectedGuest.assignment.seatNumber}
                </Badge>
              ) : (
                <Badge className="mt-1">Unseated</Badge>
              )}
            </div>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-600">Name</span>
              <Input
                value={guestForm.name}
                onChange={(event) =>
                  onGuestFormChange({ ...guestForm, name: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-600">Group</span>
              <Input
                value={guestForm.group}
                onChange={(event) =>
                  onGuestFormChange({ ...guestForm, group: event.target.value })
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-600">Notes</span>
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
                Save Guest
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void onDeleteGuest(selectedGuest.id)}
              >
                Delete
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
                Unassign
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
