import { useMemo, useState, type ChangeEventHandler } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  tableLabelById: Record<string, string>;
  selectedGuestId: string | null;
  isLoading: boolean;
  error: string | null;
  onSelectGuest: (guestId: string | null) => void;
  onCreateGuest: (name: string) => Promise<void>;
  onBulkCreateGuests: (guests: Array<{ name: string; group?: string; notes?: string }>) => Promise<void>;
  onUpdateGuest: (guestId: string, payload: { name: string; group: string; notes: string }) => Promise<void>;
  onDeleteGuest: (guestId: string) => Promise<void>;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function GuestPanel({
  guests,
  tableLabelById,
  selectedGuestId,
  isLoading,
  error,
  onSelectGuest,
  onCreateGuest,
  onBulkCreateGuests,
}: GuestPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unseated" | "assigned">("all");
  const [newGuestName, setNewGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const parts = line
          .split(",")
          .map((part) => part.trim().replace(/^"|"$/g, "").replaceAll("\"\"", "\""));
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

  return (
    <aside className="order-2 flex w-full flex-col border-t border-zinc-200 bg-zinc-50 lg:order-1 lg:h-full lg:w-[340px] lg:shrink-0 lg:border-r lg:border-t-0">
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Guests</h2>
          <Badge>{guests.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Input
            value={newGuestName}
            onChange={(event) => setNewGuestName(event.target.value)}
            placeholder="Add guest"
          />
          <Button size="sm" disabled={isSubmitting} onClick={handleCreateGuest}>
            Add
          </Button>
        </div>
      </div>
      <Separator />
      <div className="space-y-3 px-4 py-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guests"
        />
        <div className="flex gap-2">
          {(["all", "unseated", "assigned"] as const).map((next) => (
            <Button
              key={next}
              size="sm"
              variant={filter === next ? "default" : "outline"}
              onClick={() => setFilter(next)}
            >
              {next[0].toUpperCase() + next.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" type="button">
              Import
            </Button>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
          </label>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            Export
          </Button>
        </div>
      </div>
      {error ? (
        <div className="px-4 pb-3 text-xs text-red-700">{error}</div>
      ) : null}
      <Separator />
      <ScrollArea className="flex-1">
        {isLoading ? (
          <p className="p-4 text-sm text-zinc-600">Loading guests...</p>
        ) : visibleGuests.length === 0 ? (
          <p className="p-4 text-sm text-zinc-600">No guests match this filter.</p>
        ) : (
          <ul className="p-2">
            {visibleGuests.map((guest) => (
              <li key={guest.id}>
                <button
                  type="button"
                  onClick={() =>
                    onSelectGuest(selectedGuestId === guest.id ? null : guest.id)
                  }
                  className={`mb-1 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
                    selectedGuestId === guest.id
                      ? "border-zinc-400 bg-zinc-100"
                      : "border-transparent hover:border-zinc-200 hover:bg-zinc-100/70"
                  }`}
                >
                  <Avatar>
                    <AvatarFallback>{getInitials(guest.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{guest.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {guest.assignment
                        ? `${tableLabelById[guest.assignment.tableId] ?? "Table"} • Seat ${guest.assignment.seatNumber}`
                        : "Unseated"}
                    </p>
                  </div>
                  {guest.assignment ? (
                    <Badge variant="secondary">Assigned</Badge>
                  ) : (
                    <Badge>Unseated</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}
