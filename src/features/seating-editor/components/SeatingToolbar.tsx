import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
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
  lastSavedLabel,
  occupiedSeats,
  totalSeats,
  unseatedGuests,
  onPlanNameChange,
  onAddTable,
  onSave,
}: SeatingToolbarProps) {
  const titleWidthCh = Math.max(12, Math.min(48, planName.trim().length + 2));
  const statusText =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : isDirty
          ? "Unsaved changes"
          : null;

  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-2">
          <Input
            value={planName}
            onChange={(event) => onPlanNameChange(event.target.value)}
            className="h-10 border-transparent bg-zinc-50 text-lg font-semibold"
            style={{ width: `${titleWidthCh}ch` }}
            aria-label="Plan name"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            {statusText ? <Badge>{statusText}</Badge> : null}
            {lastSavedLabel ? (
              <Badge variant="secondary">Last saved {lastSavedLabel}</Badge>
            ) : null}
            <Badge variant="secondary">
              Seats: {occupiedSeats}/{totalSeats}
            </Badge>
            <Badge variant="secondary">Unseated: {unseatedGuests}</Badge>
          </div>
        </div>

        <Separator orientation="vertical" className="hidden h-10 lg:block" />

        <nav className="flex items-center gap-2">
          {["Plan", "Guests", "Tables", "Settings"].map((item) => (
            <Button key={item} variant="ghost" size="sm">
              {item}
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100">
              Add Object
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddTable}>Rectangular table</DropdownMenuItem>
              <DropdownMenuItem disabled>Round table (coming soon)</DropdownMenuItem>
              <DropdownMenuItem disabled>Buffet (coming soon)</DropdownMenuItem>
              <DropdownMenuItem disabled>Dance floor (coming soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </header>
  );
}
