"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { InspectorPanel } from "@/features/seating-editor/components/InspectorPanel";
import { SeatingCanvas } from "@/features/seating-editor/components/SeatingCanvas";
import { GuestPanel } from "@/features/seating-editor/components/GuestPanel";
import { SeatingToolbar } from "@/features/seating-editor/components/SeatingToolbar";
import { useSeatingEditorStore } from "@/features/seating-editor/store/seating-editor-store";
import type { SeatingPlan } from "@/features/seating-editor/types/seating-plan.types";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

type SaveState = "idle" | "saving" | "saved" | "error";

type ApiPlan = {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Array<{
    id: string;
    label: string;
    type: "rectangle";
    x: number;
    y: number;
    rotation: number;
    seatCount: number;
    seatLayout?: "balanced" | "top-only" | "bottom-only";
  }>;
};

type ApiGuest = {
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

type SeatAssignmentPayload = {
  assignment: {
    id: string;
    planId: string;
    tableId: string;
    guestId: string;
    seatNumber: number;
  };
};

function normalizePlan(plan: ApiPlan): SeatingPlan {
  return {
    id: plan.id,
    name: plan.name,
    width: plan.width,
    height: plan.height,
    tables: plan.tables.map((table) => ({
      id: table.id,
      label: table.label,
      type: table.type,
      x: table.x,
      y: table.y,
      rotation: table.rotation,
      seatCount: table.seatCount,
      seatLayout: table.seatLayout ?? "balanced",
    })),
  };
}

export default function SeatingPlanEditorPage() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;

  const {
    plan,
    selection,
    isDirty,
    setPlan,
    markSaved,
    updatePlanName,
    addTable,
    selectGuest,
    selectTable,
    selectSeat,
    clearSelection,
    updateSelectedTableLabel,
    updateSelectedTableSeatCount,
    updateSelectedTableSeatLayout,
    rotateSelectedTable,
    deleteSelectedTable,
    moveTable,
  } = useSeatingEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isTableDragging, setIsTableDragging] = useState(false);
  const [mobileGuestsOpen, setMobileGuestsOpen] = useState(false);
  const [mobileTablesOpen, setMobileTablesOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileTableDragEnabled, setMobileTableDragEnabled] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);
  const [isDraggingGuest, setIsDraggingGuest] = useState(false);
  const [guests, setGuests] = useState<ApiGuest[]>([]);
  const [isGuestsLoading, setIsGuestsLoading] = useState(true);
  const [guestsError, setGuestsError] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({ name: "", group: "", notes: "" });
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingAutosaveRef = useRef(false);
  const shouldAutosaveGuestsRef = useRef(false);
  const isTableDraggingRef = useRef(false);
  const isDirtyRef = useRef(isDirty);
  const planRef = useRef(plan);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    isTableDraggingRef.current = isTableDragging;
  }, [isTableDragging]);

  const selectedTableId = selection?.type === "table" ? selection.tableId : null;
  const selectedGuestId = selection?.type === "guest" ? selection.guestId : null;
  const selectedSeat =
    selection?.type === "seat"
      ? { tableId: selection.tableId, seatNumber: selection.seatNumber }
      : null;

  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId) ?? null;
  const selectedTable = plan.tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedSeatGuest =
    selectedSeat
      ? (guests.find(
          (guest) =>
            guest.assignment?.tableId === selectedSeat.tableId &&
            guest.assignment?.seatNumber === selectedSeat.seatNumber,
        ) ?? null)
      : null;
  const canvasHighlightedTableId =
    selectedTableId ??
    (selectedSeat ? selectedSeat.tableId : null) ??
    (selectedGuest?.assignment?.tableId ?? null);
  const handleSelectGuest = useCallback(
    (guestId: string | null) => {
      selectGuest(guestId);
      const guest = guests.find((item) => item.id === guestId);
      setGuestForm({
        name: guest?.name ?? "",
        group: guest?.group ?? "",
        notes: guest?.notes ?? "",
      });
    },
    [guests, selectGuest],
  );
  const handleSelectTableWithMobileInspector = useCallback(
    (tableId: string | null) => {
      selectTable(tableId);
      if (!isDesktopViewport) {
        setMobileInspectorOpen(Boolean(tableId));
      }
    },
    [isDesktopViewport, selectTable],
  );
  const handleSelectSeatWithMobileInspector = useCallback(
    (tableId: string, seatNumber: number) => {
      selectSeat(tableId, seatNumber);
      if (!isDesktopViewport) {
        setMobileInspectorOpen(true);
      }
    },
    [isDesktopViewport, selectSeat],
  );
  const startGuestDrag = useCallback((guestId: string) => {
    setDraggedGuestId(guestId);
    setIsDraggingGuest(true);
  }, []);
  const endGuestDrag = useCallback(() => {
    setDraggedGuestId(null);
    setIsDraggingGuest(false);
  }, []);

  const occupiedSeatCount = guests.filter((guest) => guest.assignment !== null).length;
  const totalSeatCount = plan.tables.reduce((sum, table) => sum + table.seatCount, 0);
  const unseatedGuestCount = guests.length - occupiedSeatCount;
  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) return null;
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastSavedAt);
  }, [lastSavedAt]);

  const seatAssignments = useMemo(
    () =>
      guests.reduce<Record<string, Record<number, { guestId: string; guestName: string }>>>(
        (acc, guest) => {
          if (!guest.assignment) {
            return acc;
          }
          const tableSeats = acc[guest.assignment.tableId] ?? {};
          tableSeats[guest.assignment.seatNumber] = {
            guestId: guest.id,
            guestName: guest.name,
          };
          acc[guest.assignment.tableId] = tableSeats;
          return acc;
        },
        {},
      ),
    [guests],
  );
  const tableLabelById = useMemo(
    () =>
      Object.fromEntries(
        plan.tables.map((table) => [table.id, table.label]),
      ) as Record<string, string>,
    [plan.tables],
  );

  const loadGuests = useCallback(async () => {
    setIsGuestsLoading(true);
    try {
      const guestsResponse = await fetch(`/api/seating-plans/${planId}/guests`, {
        cache: "no-store",
      });

      if (!guestsResponse.ok) throw new Error("Failed to load guests");

      const guestsData = (await guestsResponse.json()) as { guests: ApiGuest[] };
      setGuests(guestsData.guests ?? []);
      setGuestsError(null);
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to load guests");
    } finally {
      setIsGuestsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSaveState("idle");

        const planResponse = await fetch(`/api/seating-plans/${planId}`, {
          cache: "no-store",
        });
        if (!planResponse.ok) throw new Error("Failed to load seating plan");

        const planData = (await planResponse.json()) as { plan: ApiPlan };
        setPlan(normalizePlan(planData.plan));
        await loadGuests();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load seating plan");
      } finally {
        setIsLoading(false);
      }
    };

    if (planId) void loadPlan();
  }, [loadGuests, planId, setPlan]);

  const createAssignment = useCallback(async (guestId: string, tableId: string, seatNumber: number) => {
    const response = await fetch(`/api/seating-plans/${planId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, tableId, seatNumber }),
    });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error ?? "Failed to assign seat");
    }
    const data = (await response.json()) as SeatAssignmentPayload;
    return data.assignment;
  }, [planId]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    const response = await fetch(`/api/seating-plans/${planId}/assignments/${assignmentId}`, {
      method: "DELETE",
    });
    if (response.status === 404) {
      // Assignment can already be removed by a prior swap/unassign request; treat as no-op.
      return;
    }
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error ?? "Failed to remove assignment");
    }
  }, [planId]);

  const handleUnassignGuest = useCallback(async (assignmentId: string, guestId: string) => {
    try {
      setGuestsError(null);
      await deleteAssignment(assignmentId);
      setGuests((current) =>
        current.map((guest) => (guest.id === guestId ? { ...guest, assignment: null } : guest)),
      );
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to remove assignment");
    }
  }, [deleteAssignment]);

  const handleSeatAssign = useCallback(async (tableId: string, seatNumber: number, guestId: string | null) => {
    setGuestsError(null);
    const clickedGuest = guests.find(
      (guest) => guest.assignment?.tableId === tableId && guest.assignment?.seatNumber === seatNumber,
    );
    if (!guestId) {
      if (!clickedGuest?.assignment) return { level: "info" as const, message: "Seat is already unassigned" };
      await deleteAssignment(clickedGuest.assignment.id);
      setGuests((current) =>
        current.map((guest) => (guest.id === clickedGuest.id ? { ...guest, assignment: null } : guest)),
      );
      return { level: "success" as const, message: "Seat unassigned" };
    }

    const targetGuest = guests.find((guest) => guest.id === guestId);
    if (!targetGuest) throw new Error("Guest not found");

    const targetGuestAssignment = targetGuest.assignment;
    const clickedGuestAssignment = clickedGuest?.assignment ?? null;
    if (
      targetGuestAssignment?.tableId === tableId &&
      targetGuestAssignment?.seatNumber === seatNumber
    ) {
      return { level: "info" as const, message: "Guest is already in this seat" };
    }

    if (clickedGuestAssignment) await deleteAssignment(clickedGuestAssignment.id);
    if (targetGuestAssignment) await deleteAssignment(targetGuestAssignment.id);

    const targetToClickedSeat = await createAssignment(targetGuest.id, tableId, seatNumber);
    let clickedToTargetSeat: SeatAssignmentPayload["assignment"] | null = null;
    if (clickedGuest && targetGuestAssignment) {
      clickedToTargetSeat = await createAssignment(
        clickedGuest.id,
        targetGuestAssignment.tableId,
        targetGuestAssignment.seatNumber,
      );
    }

    setGuests((current) =>
      current.map((guest) => {
        if (guest.id === targetGuest.id) return { ...guest, assignment: targetToClickedSeat };
        if (clickedGuest && guest.id === clickedGuest.id) return { ...guest, assignment: clickedToTargetSeat };
        return guest;
      }),
    );
    if (clickedGuest && targetGuestAssignment) return { level: "success" as const, message: "Guests swapped" };
    return { level: "success" as const, message: "Seat assigned" };
  }, [createAssignment, deleteAssignment, guests]);
  const dropGuestOnSeat = useCallback(
    async (tableId: string, seatNumber: number, guestId: string) => {
      if (!isDesktopViewport) return;
      if (isTableDraggingRef.current) return;
      try {
        const result = await handleSeatAssign(tableId, seatNumber, guestId);
        if (result?.message) {
          toast({
            variant: result.level === "info" ? "info" : "success",
            title: result.level === "info" ? "Info" : "Success",
            description: result.message,
          });
        }
        handleSelectGuest(guestId);
      } catch (error) {
        setGuestsError(error instanceof Error ? error.message : "Failed to assign seat");
      } finally {
        endGuestDrag();
      }
    },
    [endGuestDrag, handleSeatAssign, handleSelectGuest, isDesktopViewport],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";
      if (isTypingInField) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedTableId) {
        event.preventDefault();
        deleteSelectedTable();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
      }

      if (event.key.toLowerCase() === "u" && selectedGuest?.assignment) {
        event.preventDefault();
        void (async () => {
          try {
            setGuestsError(null);
            await deleteAssignment(selectedGuest.assignment!.id);
            setGuests((current) =>
              current.map((guest) =>
                guest.id === selectedGuest.id ? { ...guest, assignment: null } : guest,
              ),
            );
          } catch (error) {
            setGuestsError(error instanceof Error ? error.message : "Failed to remove assignment");
          }
        })();
      }

      if (event.key === "]" && guests.length > 0) {
        event.preventDefault();
        const currentIndex = guests.findIndex((guest) => guest.id === selectedGuestId);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % guests.length;
        handleSelectGuest(guests[nextIndex].id);
      }

      if (event.key === "[" && guests.length > 0) {
        event.preventDefault();
        const currentIndex = guests.findIndex((guest) => guest.id === selectedGuestId);
        const prevIndex =
          currentIndex < 0 ? guests.length - 1 : (currentIndex - 1 + guests.length) % guests.length;
        handleSelectGuest(guests[prevIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearSelection,
    deleteAssignment,
    deleteSelectedTable,
    guests,
    handleSelectGuest,
    selectedGuest,
    selectedGuestId,
    selectedTableId,
  ]);

  const savePlan = async (source: "manual" | "auto") => {
      if (saveInFlightRef.current) {
        if (source === "auto") {
          pendingAutosaveRef.current = true;
        }
        return;
      }

      if (
        source === "auto" &&
        !isDirtyRef.current &&
        !shouldAutosaveGuestsRef.current
      ) {
        return;
      }
      if (source === "auto" && isTableDraggingRef.current) {
        pendingAutosaveRef.current = true;
        return;
      }

      saveInFlightRef.current = true;
      try {
        setSaveState("saving");
        const nextPlan = planRef.current;
        const response = await fetch(`/api/seating-plans/${nextPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextPlan.name,
          width: nextPlan.width,
          height: nextPlan.height,
          tables: nextPlan.tables.map((table) => ({
            id: table.id,
            label: table.label,
            type: table.type,
            x: table.x,
            y: table.y,
            rotation: table.rotation,
            seatCount: table.seatCount,
            seatLayout: table.seatLayout,
          })),
        }),
      });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(errorData?.error ?? "Failed to save seating plan");
        }
        const payload = (await response.json()) as { plan?: ApiPlan };
        if (payload.plan) {
          setPlan(normalizePlan(payload.plan));
        }
        await loadGuests();
        shouldAutosaveGuestsRef.current = false;
        markSaved();
        setSaveState("saved");
        setLastSavedAt(new Date());
        toast({
          title: "Saved",
          description: source === "auto" ? "Changes autosaved." : "Seating plan saved.",
          variant: "success",
        });
        setTimeout(() => setSaveState("idle"), 1200);
      } catch {
        setSaveState("error");
        toast({
          title: "Save failed",
          description: "Could not save your latest changes.",
          variant: "destructive",
        });
      } finally {
        saveInFlightRef.current = false;
        if (
          pendingAutosaveRef.current &&
          (isDirtyRef.current || shouldAutosaveGuestsRef.current)
        ) {
          pendingAutosaveRef.current = false;
          void savePlan("auto");
        } else {
          pendingAutosaveRef.current = false;
        }
      }
    };
  const scheduleAutosave = useCallback(() => {
    if (isTableDraggingRef.current) {
      pendingAutosaveRef.current = true;
      return;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void savePlan("auto");
    }, 1000);
  }, [savePlan]);

  const handleSave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await savePlan("manual");
  }, [savePlan]);

  const handleCreateGuest = useCallback(async (name: string) => {
    try {
      setGuestsError(null);
      const response = await fetch(`/api/seating-plans/${planId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? "Failed to create guest");
      }
      const data = (await response.json()) as { guest: ApiGuest };
      setGuests((current) => [...current, data.guest]);
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to create guest");
    }
  }, [planId, scheduleAutosave]);

  const handleBulkCreateGuests = useCallback(async (
    csvGuests: Array<{ name: string; group?: string; notes?: string }>,
  ) => {
    try {
      setGuestsError(null);
      const createdGuests: ApiGuest[] = [];
      for (const guest of csvGuests) {
        const response = await fetch(`/api/seating-plans/${planId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: guest.name,
            group: guest.group || null,
            notes: guest.notes || null,
          }),
        });
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorData?.error ?? "Failed to import guests");
        }
        const data = (await response.json()) as { guest: ApiGuest };
        createdGuests.push(data.guest);
      }
      setGuests((current) => [...current, ...createdGuests]);
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to import guests");
    }
  }, [planId, scheduleAutosave]);

  const handleUpdateGuest = useCallback(async (
    guestId: string,
    payload: { name: string; group: string; notes: string },
  ) => {
    const response = await fetch(`/api/seating-plans/${planId}/guests/${guestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        group: payload.group || null,
        notes: payload.notes || null,
      }),
    });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error ?? "Failed to update guest");
    }
    const data = (await response.json()) as { guest: ApiGuest };
    setGuests((current) => current.map((guest) => (guest.id === guestId ? data.guest : guest)));
    shouldAutosaveGuestsRef.current = true;
    scheduleAutosave();
  }, [planId, scheduleAutosave]);

  const handleDeleteGuest = useCallback(async (guestId: string) => {
    try {
      setGuestsError(null);
      const response = await fetch(`/api/seating-plans/${planId}/guests/${guestId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? "Failed to delete guest");
      }
      setGuests((current) => current.filter((guest) => guest.id !== guestId));
      if (selectedGuestId === guestId) clearSelection();
      shouldAutosaveGuestsRef.current = true;
      scheduleAutosave();
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to delete guest");
    }
  }, [clearSelection, planId, scheduleAutosave, selectedGuestId]);

  useEffect(() => {
    if (isLoading) return;
    if (!isDirty) return;
    scheduleAutosave();
  }, [isDirty, isLoading, scheduleAutosave]);

  useEffect(() => {
    if (isTableDragging) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }
    if (pendingAutosaveRef.current && (isDirtyRef.current || shouldAutosaveGuestsRef.current)) {
      pendingAutosaveRef.current = false;
      scheduleAutosave();
    }
  }, [isTableDragging, scheduleAutosave]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (isDirtyRef.current || shouldAutosaveGuestsRef.current) {
        void savePlan("auto");
      }
    };
  }, [savePlan]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <p className="text-sm text-zinc-600">Loading seating plan...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-50">
      {!isDesktopViewport ? (
      <div className="flex h-dvh flex-col overflow-hidden">
        <SeatingToolbar
          planName={plan.name}
          isDirty={isDirty}
          saveState={saveState}
          lastSavedLabel={lastSavedLabel}
          onPlanNameChange={updatePlanName}
          onSave={handleSave}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden border-t border-zinc-200 bg-zinc-100/40">
          <SeatingCanvas
            plan={plan}
            selectedTableId={canvasHighlightedTableId ?? undefined}
            selectedSeat={selectedSeat}
            onSelectTable={handleSelectTableWithMobileInspector}
            onSelectSeat={handleSelectSeatWithMobileInspector}
            onMoveTable={moveTable}
            seatAssignments={seatAssignments}
            tableLabelById={tableLabelById}
            selectedGuestId={selectedGuestId}
            guests={guests.map((guest) => ({
              id: guest.id,
              name: guest.name,
              assignment: guest.assignment
                ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                : null,
            }))}
            onSeatAssign={handleSeatAssign}
            onTableDragStateChange={setIsTableDragging}
            onAddTable={addTable}
            enableTableDrag={mobileTableDragEnabled}
            onToggleTableDrag={() =>
              setMobileTableDragEnabled((current) => !current)
            }
            mobileMode
          />
        </div>
        <div className="shrink-0 border-t border-zinc-200 bg-white px-2 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={mobileGuestsOpen ? "default" : "outline"}
              className="h-11 items-center justify-center gap-1 text-xs"
              onClick={() => {
                setMobileGuestsOpen(true);
                setMobileTablesOpen(false);
                setMobileInspectorOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
              Guests
            </Button>
            <Button
              size="sm"
              variant={mobileTablesOpen ? "default" : "outline"}
              className="h-11 items-center justify-center gap-1 text-xs"
              onClick={() => {
                setMobileTablesOpen(true);
                setMobileGuestsOpen(false);
                setMobileInspectorOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
              Objects
            </Button>
          </div>
        </div>

        <Drawer open={mobileGuestsOpen} onOpenChange={setMobileGuestsOpen}>
          <DrawerContent className="h-[82dvh] p-0">
            <DrawerTitle className="sr-only">Guests</DrawerTitle>
            <GuestPanel
              variant="sheet"
              guests={guests}
              tableLabelById={tableLabelById}
              selectedGuestId={selectedGuestId}
              isLoading={isGuestsLoading}
              error={guestsError}
              onSelectGuest={handleSelectGuest}
              onGuestSelected={() => setMobileGuestsOpen(false)}
              onCreateGuest={handleCreateGuest}
              onBulkCreateGuests={handleBulkCreateGuests}
              onUpdateGuest={handleUpdateGuest}
              onDeleteGuest={handleDeleteGuest}
            />
          </DrawerContent>
        </Drawer>

        <Drawer open={mobileTablesOpen} onOpenChange={setMobileTablesOpen}>
          <DrawerContent className="p-4">
            <DrawerTitle className="sr-only">Tables and objects</DrawerTitle>
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Tables & Objects</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={() => {
                  addTable();
                  setMobileTablesOpen(false);
                }}
              >
                Add rectangular table
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                Round table (coming soon)
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                Buffet (coming soon)
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                Dance floor (coming soon)
              </Button>
              <Button className="w-full justify-start" variant="outline" disabled>
                Custom object (coming soon)
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        <InspectorPanel
          selection={selection}
          isOpen={mobileInspectorOpen}
          selectedGuest={selectedGuest}
          selectedTable={selectedTable}
          selectedSeatGuest={selectedSeatGuest}
          tableLabelById={tableLabelById}
          onClose={() => setMobileInspectorOpen(false)}
          onSelectTable={(tableId) => selectTable(tableId)}
          onUnassignGuest={async (assignmentId) => {
            if (!selectedGuestId) return;
            await handleUnassignGuest(assignmentId, selectedGuestId);
          }}
          guestForm={guestForm}
          onGuestFormChange={setGuestForm}
          onSaveGuest={async (guestId) => {
            await handleUpdateGuest(guestId, guestForm);
          }}
          onDeleteGuest={handleDeleteGuest}
          onTableLabelChange={updateSelectedTableLabel}
          onTableSeatCountChange={updateSelectedTableSeatCount}
          onTableSeatLayoutChange={updateSelectedTableSeatLayout}
          onRotateTable={rotateSelectedTable}
          onDeleteTable={deleteSelectedTable}
          side="bottom"
          showOverlay
        />
      </div>
      ) : null}

      {isDesktopViewport ? (
      <div className="min-h-dvh flex-col lg:h-dvh flex">
        <SeatingToolbar
          planName={plan.name}
          isDirty={isDirty}
          saveState={saveState}
          lastSavedLabel={lastSavedLabel}
          onPlanNameChange={updatePlanName}
          onSave={handleSave}
        />
        <div className="flex min-h-0 flex-1 flex-row">
          <GuestPanel
            guests={guests}
            tableLabelById={tableLabelById}
            selectedGuestId={selectedGuestId}
            isLoading={isGuestsLoading}
            error={guestsError}
            onSelectGuest={handleSelectGuest}
            onCreateGuest={handleCreateGuest}
            onBulkCreateGuests={handleBulkCreateGuests}
            onUpdateGuest={handleUpdateGuest}
            onDeleteGuest={handleDeleteGuest}
            enableGuestDnD
            onGuestDragStart={startGuestDrag}
            onGuestDragEnd={endGuestDrag}
          />
          <div className="relative order-2 flex w-full bg-zinc-100/40 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-t-0">
            <SeatingCanvas
              plan={plan}
              selectedTableId={canvasHighlightedTableId ?? undefined}
              selectedSeat={selectedSeat}
              onSelectTable={selectTable}
              onSelectSeat={selectSeat}
              onMoveTable={moveTable}
              seatAssignments={seatAssignments}
              tableLabelById={tableLabelById}
              selectedGuestId={selectedGuestId}
              guests={guests.map((guest) => ({
                id: guest.id,
                name: guest.name,
                assignment: guest.assignment
                  ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                  : null,
              }))}
              onSeatAssign={handleSeatAssign}
              onTableDragStateChange={setIsTableDragging}
              onAddTable={addTable}
              enableTableDrag
              draggedGuestId={draggedGuestId}
              isDraggingGuest={isDraggingGuest}
              enableSeatDrag={isDesktopViewport}
              onSeatGuestDragStart={startGuestDrag}
              onSeatGuestDragEnd={endGuestDrag}
              onGuestDropToSeat={dropGuestOnSeat}
            />
            <InspectorPanel
              selection={selection}
              isOpen={selection !== null}
              selectedGuest={selectedGuest}
              selectedTable={selectedTable}
              selectedSeatGuest={selectedSeatGuest}
              tableLabelById={tableLabelById}
              onClose={clearSelection}
              onSelectTable={(tableId) => selectTable(tableId)}
              onUnassignGuest={async (assignmentId) => {
                if (!selectedGuestId) return;
                await handleUnassignGuest(assignmentId, selectedGuestId);
              }}
              guestForm={guestForm}
              onGuestFormChange={setGuestForm}
              onSaveGuest={async (guestId) => {
                await handleUpdateGuest(guestId, guestForm);
              }}
              onDeleteGuest={handleDeleteGuest}
              onTableLabelChange={updateSelectedTableLabel}
              onTableSeatCountChange={updateSelectedTableSeatCount}
              onTableSeatLayoutChange={updateSelectedTableSeatLayout}
              onRotateTable={rotateSelectedTable}
              onDeleteTable={deleteSelectedTable}
            />
          </div>
        </div>
      </div>
      ) : null}
    </main>
  );
}
