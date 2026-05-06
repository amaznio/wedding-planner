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
  variant?: "desktop" | "sheet";
  onGuestSelected?: () => void;
  enableGuestDnD?: boolean;
  onGuestDragStart?: (guestId: string) => void;
  onGuestDragEnd?: () => void;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function createGuestDragPreview(name: string): HTMLDivElement {
  const preview = document.createElement("div");
  preview.style.position = "fixed";
  preview.style.top = "-9999px";
  preview.style.left = "-9999px";
  preview.style.pointerEvents = "none";
  preview.style.display = "inline-flex";
  preview.style.alignItems = "center";
  preview.style.gap = "8px";
  preview.style.padding = "8px 10px";
  preview.style.border = "1px solid rgb(209 213 219)";
  preview.style.borderRadius = "999px";
  preview.style.background = "white";
  preview.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.16)";
  preview.style.color = "rgb(24 24 27)";
  preview.style.fontSize = "12px";
  preview.style.fontWeight = "600";
  preview.style.maxWidth = "260px";

  const avatar = document.createElement("span");
  avatar.textContent = getInitials(name);
  avatar.style.display = "inline-flex";
  avatar.style.alignItems = "center";
  avatar.style.justifyContent = "center";
  avatar.style.width = "24px";
  avatar.style.height = "24px";
  avatar.style.borderRadius = "999px";
  avatar.style.border = "1px solid rgb(147 197 253)";
  avatar.style.background = "rgb(239 246 255)";
  avatar.style.color = "rgb(30 64 175)";
  avatar.style.fontWeight = "700";
  avatar.style.fontSize = "11px";

  const label = document.createElement("span");
  label.textContent = name;
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";

  preview.appendChild(avatar);
  preview.appendChild(label);
  document.body.appendChild(preview);

  return preview;
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

  const rootClassName =
    variant === "sheet"
      ? "flex h-full w-full flex-col bg-zinc-50"
      : "order-2 flex w-full flex-col border-t border-zinc-200 bg-zinc-50 lg:order-1 lg:h-full lg:w-[340px] lg:shrink-0 lg:border-r lg:border-t-0";

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
          <Button disabled={isSubmitting} onClick={handleCreateGuest}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex gap-2">
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
      <Separator />
      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Guest list</p>
          <Badge>{visibleGuests.length}</Badge>
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
              size="sm"
              variant={filter === next ? "default" : "outline"}
              onClick={() => setFilter(next)}
            >
              {next[0].toUpperCase() + next.slice(1)}
            </Button>
          ))}
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
