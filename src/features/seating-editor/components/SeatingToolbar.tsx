type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  occupiedSeats: number;
  totalSeats: number;
  unseatedGuests: number;
  onPlanNameChange: (name: string) => void;
  onAddTable: () => void;
  onSave: () => void;
};

export function SeatingToolbar({
  planName,
  isDirty,
  saveState,
  occupiedSeats,
  totalSeats,
  unseatedGuests,
  onPlanNameChange,
  onAddTable,
  onSave,
}: SeatingToolbarProps) {
  const statusText =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : isDirty
          ? "Unsaved changes"
          : saveState === "saved"
            ? "Saved"
            : "No local changes";

  return (
    <header className="border-b border-zinc-200 bg-zinc-50/95 px-3 py-3 backdrop-blur sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
        <input
          type="text"
          value={planName}
          onChange={(event) => onPlanNameChange(event.target.value)}
          className="block w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 text-2xl font-semibold text-zinc-900 focus:border-zinc-300 focus:bg-white focus:outline-none"
          aria-label="Plan name"
        />
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
            <span>{statusText}</span>
            <span className="text-zinc-400">|</span>
            <span>Seats: {occupiedSeats}/{totalSeats} occupied</span>
            <span className="text-zinc-400">|</span>
            <span>Unseated guests: {unseatedGuests}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || saveState === "saving"}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveState === "saving" ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onAddTable}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Add Table
          </button>
        </div>
      </div>
    </header>
  );
}
