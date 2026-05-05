"use client";

import { SeatingCanvas } from "@/features/seating-editor/components/SeatingCanvas";
import { SeatingSidebar } from "@/features/seating-editor/components/SeatingSidebar";
import { SeatingToolbar } from "@/features/seating-editor/components/SeatingToolbar";
import { useSeatingEditorStore } from "@/features/seating-editor/store/seating-editor-store";

export default function SeatingPlansPage() {
  const {
    plan,
    selectedTableId,
    isDirty,
    addTable,
    selectTable,
    updateSelectedTableLabel,
    updateSelectedTableSeatCount,
    rotateSelectedTable,
    deleteSelectedTable,
    moveTable,
  } = useSeatingEditorStore();

  const selectedTable =
    plan.tables.find((table) => table.id === selectedTableId) ?? null;

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-zinc-50 p-6">
      <SeatingToolbar
        planName={plan.name}
        isDirty={isDirty}
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
