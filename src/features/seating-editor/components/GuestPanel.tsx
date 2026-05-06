import { useMemo, useState, type ChangeEventHandler } from "react";

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

type GuestPanelProps = {
  guests: Guest[];
  selectedGuestId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onCreateGuest: (name: string) => Promise<void>;
  onBulkCreateGuests: (guests: Array<{ name: string; group?: string; notes?: string }>) => Promise<void>;
  onUpdateGuest: (guestId: string, payload: { name: string; group: string; notes: string }) => Promise<void>;
  onDeleteGuest: (guestId: string) => Promise<void>;
};

export function GuestPanel({
  guests,
  selectedGuestId,
  isLoading,
  error,
  onSelectGuest,
  onCreateGuest,
  onBulkCreateGuests,
  onUpdateGuest,
  onDeleteGuest,
}: GuestPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unseated">("all");
  const [newGuestName, setNewGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGuest =
    guests.find((guest) => guest.id === selectedGuestId) ?? null;

  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const visibleGuests = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesFilter = filter === "all" ? true : guest.assignment === null;
      const matchesQuery =
        queryLower.length === 0
          ? true
          : guest.name.toLowerCase().includes(queryLower) ||
            (guest.group ?? "").toLowerCase().includes(queryLower);
      return matchesFilter && matchesQuery;
    });
  }, [filter, guests, query]);

  const unseatedCount = useMemo(
    () => guests.filter((guest) => guest.assignment === null).length,
    [guests],
  );

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
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return;

    const parsed = lines
      .slice(1)
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim().replace(/^"|"$/g, "").replaceAll("\"\"", "\""));
        return {
          name: parts[0] ?? "",
          group: parts[1] ?? "",
          notes: parts[2] ?? "",
        };
      })
      .filter((row) => row.name.length > 0);

    if (parsed.length > 0) {
      await onBulkCreateGuests(parsed);
    }

    event.target.value = "";
  };

  const handleSaveGuest = async () => {
    if (!selectedGuest) return;

    setIsSubmitting(true);
    try {
      await onUpdateGuest(selectedGuest.id, {
        name: editName.trim(),
        group: editGroup.trim(),
        notes: editNotes.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectGuest = (guest: Guest) => {
    onSelectGuest(guest.id);
    setEditName(guest.name);
    setEditGroup(guest.group ?? "");
    setEditNotes(guest.notes ?? "");
  };

  return (
    <aside className="order-2 w-full max-h-[42dvh] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 lg:order-1 lg:max-h-none lg:max-w-sm lg:overflow-visible">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Guests</h2>
        <span className="text-xs text-zinc-600">Unseated: {unseatedCount}</span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={newGuestName}
          onChange={(event) => setNewGuestName(event.target.value)}
          placeholder="Guest name"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleCreateGuest}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100">
          Import CSV
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
        </label>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-3 space-y-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guests"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === "all"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-700"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unseated")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === "unseated"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-700"
            }`}
          >
            Unseated
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 max-h-56 overflow-auto rounded-md border border-zinc-200">
        {isLoading ? (
          <p className="p-3 text-sm text-zinc-600">Loading guests...</p>
        ) : visibleGuests.length === 0 ? (
          <p className="p-3 text-sm text-zinc-600">No guests match this filter.</p>
        ) : (
          <ul>
            {visibleGuests.map((guest) => (
              <li key={guest.id}>
                <button
                  type="button"
                  onClick={() => handleSelectGuest(guest)}
                  className={`flex w-full items-center justify-between border-b border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                    selectedGuestId === guest.id ? "bg-zinc-100" : ""
                  }`}
                >
                  <span className="font-medium text-zinc-800">{guest.name}</span>
                  <span className="text-xs text-zinc-500">
                    {guest.assignment ? "Assigned" : "Unseated"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 border-t border-zinc-200 pt-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Selected Guest</h3>
          {!selectedGuest ? (
            <p className="mt-1 text-xs text-zinc-600">No guest selected.</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-600">
              Editing: <span className="font-medium text-zinc-800">{selectedGuest.name}</span>
            </p>
          )}
        </div>

        {!selectedGuest ? (
          <p className="text-sm text-zinc-600">Select a guest from the list to edit details.</p>
        ) : (
          <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Name</span>
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Group</span>
            <input
              type="text"
              value={editGroup}
              onChange={(event) => setEditGroup(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Notes</span>
            <textarea
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveGuest}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
            >
              Save Guest
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onDeleteGuest(selectedGuest.id);
                  onSelectGuest(null);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete Guest
            </button>
          </div>
          </div>
        )}
      </div>
    </aside>
  );
}
