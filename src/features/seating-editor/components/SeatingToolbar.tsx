type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  onAddTable: () => void;
};

export function SeatingToolbar({
  planName,
  isDirty,
  onAddTable,
}: SeatingToolbarProps) {
  return (
    <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{planName}</h1>
        <p className="text-sm text-zinc-600">
          {isDirty ? "Unsaved local changes" : "No local changes"}
        </p>
      </div>

      <button
        type="button"
        onClick={onAddTable}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Add Table
      </button>
    </header>
  );
}
