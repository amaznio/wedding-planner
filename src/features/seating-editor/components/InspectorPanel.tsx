import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { SeatingTable } from "../types/seating-plan.types";

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

type Selection =
  | { type: "guest"; guestId: string }
  | { type: "table"; tableId: string }
  | { type: "seat"; tableId: string; seatNumber: number }
  | null;

type InspectorPanelProps = {
  selection: Selection;
  isOpen: boolean;
  selectedGuest: Guest | null;
  selectedTable: SeatingTable | null;
  selectedSeatGuest: Guest | null;
  tableLabelById?: Record<string, string>;
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
  onUnassignGuest: (assignmentId: string) => Promise<void>;
  guestForm: { name: string; group: string; notes: string };
  onGuestFormChange: (next: { name: string; group: string; notes: string }) => void;
  onSaveGuest: (guestId: string) => Promise<void>;
  onDeleteGuest: (guestId: string) => Promise<void>;
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
  selectedTable,
  selectedSeatGuest,
  tableLabelById = {},
  onClose,
  onSelectTable,
  onUnassignGuest,
  guestForm,
  onGuestFormChange,
  onSaveGuest,
  onDeleteGuest,
  onTableLabelChange,
  onTableSeatCountChange,
  onTableSeatLayoutChange,
  onRotateTable,
  onDeleteTable,
  side = "right",
  showOverlay = false,
}: InspectorPanelProps) {
  const isMobileDrawer = side === "bottom";
  const contentAreaClassName = isMobileDrawer
    ? "max-h-[56dvh] overflow-auto p-4"
    : "flex-1 overflow-auto p-4";
  const inspectorBody = (
    <div className="flex flex-col">
      {!isMobileDrawer ? (
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Inspector</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <Separator />
        </>
      ) : null}
      <div className={contentAreaClassName}>
          {!selection ? (
            <p className="text-sm text-zinc-600">Select a guest, table, or seat.</p>
          ) : null}

          {selection?.type === "guest" && selectedGuest ? (
            <div className="space-y-3">
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
                  rows={4}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void onSaveGuest(selectedGuest.id)}>
                  Save Guest
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void onDeleteGuest(selectedGuest.id)}
                >
                  Delete
                </Button>
              </div>
              {selectedGuest.assignment ? (
                <Button
                  variant="outline"
                  onClick={() => void onUnassignGuest(selectedGuest.assignment!.id)}
                >
                  Unassign
                </Button>
              ) : (
                <p className="text-xs text-zinc-600">Select a seat to assign this guest.</p>
              )}
            </div>
          ) : null}

          {selection?.type === "table" && selectedTable ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900">Table Settings</p>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">Table Name</span>
                <Input
                  value={selectedTable.label}
                  onChange={(event) => onTableLabelChange(event.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-zinc-600">Seat Count</span>
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
                <span className="text-xs text-zinc-600">Seat layout</span>
                <select
                  value={selectedTable.seatLayout}
                  onChange={(event) =>
                    onTableSeatLayoutChange(
                      event.target.value as "balanced" | "top-only" | "bottom-only",
                    )
                  }
                  className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  <option value="balanced">Balanced (top + bottom)</option>
                  <option value="top-only">Top side only</option>
                  <option value="bottom-only">Bottom side only</option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onRotateTable}>
                  Rotate 90°
                </Button>
                <Button variant="destructive" onClick={onDeleteTable}>
                  Delete
                </Button>
              </div>
            </div>
          ) : null}

          {selection?.type === "seat" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-zinc-900">
                Seat {selection.seatNumber}
              </p>
              <p className="text-xs text-zinc-600">
                {tableLabelById[selection.tableId] ?? "Table"}
              </p>
              {selectedSeatGuest ? (
                <Badge variant="secondary">Assigned: {selectedSeatGuest.name}</Badge>
              ) : (
                <Badge>Unassigned</Badge>
              )}
              <p className="text-xs text-zinc-600">
                Assignment actions stay in the seat popover in this phase.
              </p>
              <Button variant="outline" onClick={() => onSelectTable(selection.tableId)}>
                Go to table
              </Button>
            </div>
          ) : null}
      </div>
    </div>
  );

  if (side === "bottom") {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <DrawerContent className="h-auto max-h-[56dvh] p-0">
          <DrawerTitle className="sr-only">Inspector</DrawerTitle>
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
      >
        <SheetTitle className="sr-only">Inspector</SheetTitle>
        {inspectorBody}
      </SheetContent>
    </Sheet>
  );
}
