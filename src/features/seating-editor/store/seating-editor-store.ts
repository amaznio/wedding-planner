import { create } from "zustand";

import type { SeatingPlan, SeatingTable } from "../types/seating-plan.types";

type SeatingEditorState = {
  plan: SeatingPlan;
  selectedTableId: string | null;
  isDirty: boolean;
  addTable: () => void;
  selectTable: (tableId: string | null) => void;
  updateSelectedTableLabel: (label: string) => void;
  updateSelectedTableSeatCount: (seatCount: number) => void;
  rotateSelectedTable: () => void;
  deleteSelectedTable: () => void;
  moveTable: (tableId: string, nextX: number, nextY: number) => void;
};

const DEFAULT_PLAN: SeatingPlan = {
  id: "demo-plan-1",
  name: "Wedding Reception Layout",
  width: 1400,
  height: 900,
  tables: [
    {
      id: "table-1",
      label: "Family",
      type: "rectangle",
      x: 160,
      y: 180,
      rotation: 0,
      seatCount: 6,
    },
    {
      id: "table-2",
      label: "Friends",
      type: "rectangle",
      x: 520,
      y: 320,
      rotation: 0,
      seatCount: 9,
    },
  ],
};

function getNextTable(tableCount: number): SeatingTable {
  const nextIndex = tableCount + 1;

  return {
    id: `table-${nextIndex}`,
    label: `Table ${nextIndex}`,
    type: "rectangle",
    x: 120 + (tableCount % 5) * 220,
    y: 120 + Math.floor(tableCount / 5) * 170,
    rotation: 0,
    seatCount: 8,
  };
}

export const useSeatingEditorStore = create<SeatingEditorState>((set, get) => ({
  plan: DEFAULT_PLAN,
  selectedTableId: DEFAULT_PLAN.tables[0]?.id ?? null,
  isDirty: false,
  addTable: () => {
    const state = get();
    const nextTable = getNextTable(state.plan.tables.length);

    set({
      plan: {
        ...state.plan,
        tables: [...state.plan.tables, nextTable],
      },
      selectedTableId: nextTable.id,
      isDirty: true,
    });
  },
  selectTable: (tableId) => {
    set({ selectedTableId: tableId });
  },
  updateSelectedTableLabel: (label) => {
    const state = get();
    if (!state.selectedTableId) return;

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === state.selectedTableId ? { ...table, label } : table,
        ),
      },
      isDirty: true,
    });
  },
  updateSelectedTableSeatCount: (seatCount) => {
    const state = get();
    if (!state.selectedTableId) return;

    const boundedSeatCount = Math.min(24, Math.max(1, Math.floor(seatCount)));

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === state.selectedTableId
            ? { ...table, seatCount: boundedSeatCount }
            : table,
        ),
      },
      isDirty: true,
    });
  },
  rotateSelectedTable: () => {
    const state = get();
    if (!state.selectedTableId) return;

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === state.selectedTableId
            ? { ...table, rotation: (table.rotation + 90) % 360 }
            : table,
        ),
      },
      isDirty: true,
    });
  },
  deleteSelectedTable: () => {
    const state = get();
    if (!state.selectedTableId) return;

    const nextTables = state.plan.tables.filter(
      (table) => table.id !== state.selectedTableId,
    );

    set({
      plan: {
        ...state.plan,
        tables: nextTables,
      },
      selectedTableId: nextTables[0]?.id ?? null,
      isDirty: true,
    });
  },
  moveTable: (tableId, nextX, nextY) => {
    const state = get();

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                x: Math.round(nextX),
                y: Math.round(nextY),
              }
            : table,
        ),
      },
      isDirty: true,
    });
  },
}));
