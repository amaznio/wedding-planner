"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { SeatingCanvas } from "@/features/seating-editor/components/SeatingCanvas";
import { SeatingSidebar } from "@/features/seating-editor/components/SeatingSidebar";
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
    selectedTableId,
    isDirty,
    setPlan,
    markSaved,
    addTable,
    selectTable,
    updateSelectedTableLabel,
    updateSelectedTableSeatCount,
    rotateSelectedTable,
    deleteSelectedTable,
    moveTable,
  } = useSeatingEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setSaveState("idle");

        const response = await fetch(`/api/seating-plans/${planId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load seating plan");
        }

        const data = (await response.json()) as { plan: ApiPlan };
        setPlan(normalizePlan(data.plan));
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load seating plan",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (planId) {
      void loadPlan();
    }
  }, [planId, setPlan]);

  const selectedTable = useMemo(
    () => plan.tables.find((table) => table.id === selectedTableId) ?? null,
    [plan.tables, selectedTableId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingInField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (isTypingInField) {
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedTableId) {
        event.preventDefault();
        deleteSelectedTable();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        selectTable(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedTable, selectTable, selectedTableId]);

  const handleSave = async () => {
    try {
      setSaveState("saving");

      const response = await fetch(`/api/seating-plans/${plan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error("Failed to save seating plan");
      }

      markSaved();
      setSaveState("saved");
      setTimeout(() => {
        setSaveState("idle");
      }, 1200);
    } catch {
      setSaveState("error");
    }
  };

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
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-zinc-50 p-6">
      <SeatingToolbar
        planName={plan.name}
        isDirty={isDirty}
        saveState={saveState}
        onSave={handleSave}
        onAddTable={addTable}
      />

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <SeatingCanvas
          plan={plan}
          selectedTableId={selectedTableId ?? undefined}
          onSelectTable={selectTable}
          onMoveTable={moveTable}
        />
        <SeatingSidebar
          selectedTable={selectedTable}
          onLabelChange={updateSelectedTableLabel}
          onSeatCountChange={updateSelectedTableSeatCount}
          onRotate={rotateSelectedTable}
          onDelete={deleteSelectedTable}
        />
      </div>
    </main>
  );
}
