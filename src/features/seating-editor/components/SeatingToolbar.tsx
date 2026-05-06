import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type SeatingToolbarProps = {
  planName: string;
  isDirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedLabel: string | null;
  onPlanNameChange: (name: string) => void;
  onSave: () => void;
};

export function SeatingToolbar({
  planName,
  isDirty,
  saveState,
  lastSavedLabel,
  onPlanNameChange,
  onSave,
}: SeatingToolbarProps) {
  const router = useRouter();
  const [isMobileEditingTitle, setIsMobileEditingTitle] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const titleWidthCh = Math.max(12, Math.min(48, planName.trim().length + 2));
  const statusText =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : isDirty
          ? "Unsaved changes"
          : lastSavedLabel
            ? `Saved ${lastSavedLabel}`
            : "Saved";

  return (
    <header className="border-b border-zinc-200 bg-white px-3 py-1.5 md:px-4 md:py-2">
      <div className="hidden h-12 items-center md:flex">
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={planName}
            onChange={(event) => onPlanNameChange(event.target.value)}
            className="h-9 border-transparent bg-zinc-50 text-base font-semibold"
            style={{ width: `${titleWidthCh}ch` }}
            aria-label="Plan name"
          />
          <Badge variant="secondary" className="h-6 px-2 text-[11px]">
            {statusText}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button className="h-9 px-4" onClick={onSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex h-10 items-center justify-between px-1">
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Menu"
            onClick={() => setIsMobileNavOpen(true)}
          >
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
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
          </div>
        </div>
        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetContent side="left" showOverlay className="w-[280px] p-4 sm:max-w-[280px]">
            <SheetTitle className="text-left text-sm font-semibold text-zinc-900">
              Navigation
            </SheetTitle>
            <div className="mt-3 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  router.push("/");
                }}
              >
                Home
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  router.push("/seating-plans");
                }}
              >
                Seating plans
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                Current plan
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
