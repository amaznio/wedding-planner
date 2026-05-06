"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { InspectorPanel } from "@/features/seating-editor/components/InspectorPanel";
import { SeatingCanvas } from "@/features/seating-editor/components/SeatingCanvas";
import { GuestPanel } from "@/features/seating-editor/components/GuestPanel";
import { SeatingToolbar } from "@/features/seating-editor/components/SeatingToolbar";
import { useSeatingEditorStore } from "@/features/seating-editor/store/seating-editor-store";
import type { SeatingPlan } from "@/features/seating-editor/types/seating-plan.types";

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
    rotateSelectedTable,
    deleteSelectedTable,
    moveTable,
  } = useSeatingEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [guests, setGuests] = useState<ApiGuest[]>([]);
  const [isGuestsLoading, setIsGuestsLoading] = useState(true);
  const [guestsError, setGuestsError] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({ name: "", group: "", notes: "" });

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

  const occupiedSeatCount = guests.filter((guest) => guest.assignment !== null).length;
  const totalSeatCount = plan.tables.reduce((sum, table) => sum + table.seatCount, 0);
  const unseatedGuestCount = guests.length - occupiedSeatCount;

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

  const handleSave = useCallback(async () => {
    try {
      setSaveState("saving");
      const response = await fetch(`/api/seating-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          })),
        }),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error ?? "Failed to save seating plan");
      }
      const payload = (await response.json()) as { plan?: ApiPlan };
      if (payload.plan) setPlan(normalizePlan(payload.plan));
      await loadGuests();
      markSaved();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  }, [loadGuests, markSaved, plan.height, plan.id, plan.name, plan.tables, plan.width, setPlan]);

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
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to create guest");
    }
  }, [planId]);

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
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to import guests");
    }
  }, [planId]);

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
  }, [planId]);

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
    } catch (error) {
      setGuestsError(error instanceof Error ? error.message : "Failed to delete guest");
    }
  }, [clearSelection, planId, selectedGuestId]);

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
    <main className="flex min-h-dvh flex-col bg-zinc-50 lg:h-dvh">
      <SeatingToolbar
        planName={plan.name}
        isDirty={isDirty}
        saveState={saveState}
        occupiedSeats={occupiedSeatCount}
        totalSeats={totalSeatCount}
        unseatedGuests={unseatedGuestCount}
        onPlanNameChange={updatePlanName}
        onSave={handleSave}
        onAddTable={addTable}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <GuestPanel
          guests={guests}
          selectedGuestId={selectedGuestId}
          isLoading={isGuestsLoading}
          error={guestsError}
          onSelectGuest={handleSelectGuest}
          onCreateGuest={handleCreateGuest}
          onBulkCreateGuests={handleBulkCreateGuests}
          onUpdateGuest={handleUpdateGuest}
          onDeleteGuest={handleDeleteGuest}
        />
        <div className="relative order-1 flex h-[56dvh] w-full border-t border-zinc-200 bg-zinc-100/40 lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1 lg:border-t-0">
          <SeatingCanvas
            plan={plan}
            selectedTableId={canvasHighlightedTableId ?? undefined}
            selectedSeat={selectedSeat}
            onSelectTable={selectTable}
            onSelectSeat={selectSeat}
            onMoveTable={moveTable}
            seatAssignments={seatAssignments}
            selectedGuestId={selectedGuestId}
            guests={guests.map((guest) => ({
              id: guest.id,
              name: guest.name,
              assignment: guest.assignment
                ? { tableId: guest.assignment.tableId, seatNumber: guest.assignment.seatNumber }
                : null,
            }))}
            onSeatAssign={handleSeatAssign}
          />
          <InspectorPanel
            selection={selection}
            isOpen={selection !== null}
            selectedGuest={selectedGuest}
            selectedTable={selectedTable}
            selectedSeatGuest={selectedSeatGuest}
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
            onRotateTable={rotateSelectedTable}
            onDeleteTable={deleteSelectedTable}
          />
        </div>
      </div>
    </main>
  );
}
