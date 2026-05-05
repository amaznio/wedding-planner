import type { SeatingTable } from "../types/seating-plan.types";

type SeatingSidebarProps = {
  selectedTable: SeatingTable | null;
  onLabelChange: (label: string) => void;
  onSeatCountChange: (seatCount: number) => void;
  onRotate: () => void;
  onDelete: () => void;
};

export function SeatingSidebar({
  selectedTable,
  onLabelChange,
  onSeatCountChange,
  onRotate,
  onDelete,
}: SeatingSidebarProps) {
  return (
    <aside className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white p-4">
      {!selectedTable ? (
        <p className="text-sm text-zinc-600">Select a table to edit its settings.</p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-zinc-900">Table Settings</h2>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Label</span>
            <input
              type="text"
              value={selectedTable.label}
              onChange={(event) => onLabelChange(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Seat Count</span>
            <input
              type="number"
              min={1}
              max={24}
              value={selectedTable.seatCount}
              onChange={(event) =>
                onSeatCountChange(Number.parseInt(event.target.value, 10) || 1)
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onRotate}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Rotate 90°
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete Table
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
