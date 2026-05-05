type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  occupiedSeats: number;
  totalSeats: number;
  unseatedGuests: number;
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
    <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{planName}</h1>
        <p className="text-sm text-zinc-600">{statusText}</p>
        <p className="text-xs text-zinc-500">
          Seats: {occupiedSeats}/{totalSeats} occupied · Unseated guests: {unseatedGuests}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || saveState === "saving"}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
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
    </header>
  );
}
