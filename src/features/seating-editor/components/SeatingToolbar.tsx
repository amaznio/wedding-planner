import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  occupiedSeats: number;
  totalSeats: number;
  unseatedGuests: number;
  onPlanNameChange: (name: string) => void;
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
  onSave,
}: SeatingToolbarProps) {
  const [isMobileEditingTitle, setIsMobileEditingTitle] = useState(false);
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
    <header className="border-b border-zinc-200 bg-white px-3 py-2 md:px-4 md:py-3">
      <div className="hidden flex-wrap items-center gap-4 md:flex">
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

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex h-12 items-center justify-between px-1">
          <Button type="button" variant="ghost" className="h-8 w-8 p-0" aria-label="Menu">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </Button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">
            {isMobileEditingTitle ? (
              <Input
                value={planName}
                onChange={(event) => onPlanNameChange(event.target.value)}
                className="h-8 w-[170px] max-w-[48vw] border-transparent bg-zinc-50 text-sm font-semibold"
                aria-label="Plan name"
              />
            ) : (
              <p className="truncate text-sm font-semibold text-zinc-900">
                {planName}
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              className="h-7 w-7 p-0"
              aria-label={isMobileEditingTitle ? "Done editing title" : "Edit title"}
              onClick={() => setIsMobileEditingTitle((current) => !current)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onSave}
              disabled={saveState === "saving"}
              aria-label={saveState === "saving" ? "Saving" : "Save"}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </Button>
            <Button type="button" variant="ghost" className="h-8 w-8 p-0" aria-label="Guests">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
            </Button>
            <Button type="button" variant="ghost" className="h-8 w-8 p-0" aria-label="More">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
