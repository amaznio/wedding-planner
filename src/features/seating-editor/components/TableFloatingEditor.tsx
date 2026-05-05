import type { SeatingTable } from "../types/seating-plan.types";

type TableFloatingEditorProps = {
  selectedTable: SeatingTable | null;
  onLabelChange: (label: string) => void;
  onSeatCountChange: (seatCount: number) => void;
  onRotate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function TableFloatingEditor({
  selectedTable,
  onLabelChange,
  onSeatCountChange,
  onRotate,
  onDelete,
  onClose,
}: TableFloatingEditorProps) {
  if (!selectedTable) {
    return null;
  }

  return (
    <div className="pointer-events-auto w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-300 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Edit Table</h3>
          <p className="text-xs text-zinc-600">Adjust table name and seating quickly.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Table Name</span>
          <input
            type="text"
            value={selectedTable.label}
            onChange={(event) => onLabelChange(event.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Seat Count</span>
          <input
            type="number"
            min={1}
            max={50}
            value={selectedTable.seatCount}
            onChange={(event) =>
              onSeatCountChange(Number.parseInt(event.target.value, 10) || 1)
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <span className="mt-1 block text-xs text-zinc-500">Allowed range: 1 to 50 seats.</span>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRotate}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Rotate 90°
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
