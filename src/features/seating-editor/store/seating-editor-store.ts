import { create } from "zustand";

import type {
  PlanPairSidePreference,
  SeatingPlan,
  SeatingTable,
  SeatingTableType,
} from "../types/seating-plan.types";

const GRID_SIZE = 24;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

type SeatingEditorState = {
  plan: SeatingPlan;
  selection:
    | { type: "guest"; guestId: string }
    | { type: "table"; tableId: string }
    | { type: "seat"; tableId: string; seatNumber: number }
    | null;
  isDirty: boolean;
  setPlan: (
    plan: SeatingPlan,
    options?: { preserveSelection?: boolean },
  ) => void;
  markSaved: () => void;
  updatePlanName: (name: string) => void;
  updatePlanPairSidePreference: (preference: PlanPairSidePreference) => void;
  addTable: (type?: SeatingTableType, labelPrefix?: string) => void;
  selectGuest: (guestId: string | null) => void;
  selectTable: (tableId: string | null) => void;
  selectSeat: (tableId: string, seatNumber: number) => void;
  clearSelection: () => void;
  updateSelectedTableLabel: (label: string) => void;
  updateSelectedTableSeatCount: (seatCount: number) => void;
  updateSelectedTableSeatLayout: (
    seatLayout: "balanced" | "top-only" | "bottom-only",
  ) => void;
  rotateSelectedTable: () => void;
  deleteSelectedTable: () => void;
  moveTable: (tableId: string, nextX: number, nextY: number) => void;
};

const DEFAULT_PLAN: SeatingPlan = {
  id: "demo-plan-1",
  name: "Wedding Reception Layout",
  width: 1400,
  height: 900,
  pairSidePreference: "auto",
  tables: [
    {
      id: "table-1",
      label: "Family",
      type: "rectangle",
      x: 160,
      y: 180,
      rotation: 0,
      seatCount: 6,
      seatLayout: "balanced",
    },
    {
      id: "table-2",
      label: "Friends",
      type: "rectangle",
      x: 520,
      y: 320,
      rotation: 0,
      seatCount: 9,
      seatLayout: "balanced",
    },
  ],
};

function getNextTable(
  tableCount: number,
  type: SeatingTableType = "rectangle",
  labelPrefix = "Table",
): SeatingTable {
  const nextIndex = tableCount + 1;
  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `table-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    id: generatedId,
    label: `${labelPrefix} ${nextIndex}`,
    type,
    x: 120 + (tableCount % 5) * 220,
    y: 120 + Math.floor(tableCount / 5) * 170,
    rotation: 0,
    seatCount: 8,
    seatLayout: "balanced",
  };
}

export const useSeatingEditorStore = create<SeatingEditorState>((set, get) => ({
  plan: DEFAULT_PLAN,
  selection: DEFAULT_PLAN.tables[0]
    ? { type: "table", tableId: DEFAULT_PLAN.tables[0].id }
    : null,
  isDirty: false,
  setPlan: (plan, options) => {
    const currentSelection = get().selection;
    let nextSelection: SeatingEditorState["selection"] = null;

    if (options?.preserveSelection && currentSelection) {
      if (currentSelection.type === "table") {
        const tableExists = plan.tables.some(
          (table) => table.id === currentSelection.tableId,
        );
        nextSelection = tableExists ? currentSelection : null;
      } else if (currentSelection.type === "seat") {
        const selectedTable = plan.tables.find(
          (table) => table.id === currentSelection.tableId,
        );
        nextSelection =
          selectedTable && currentSelection.seatNumber <= selectedTable.seatCount
            ? currentSelection
            : null;
      } else {
        nextSelection = currentSelection;
      }
    }

    set({
      plan,
      selection: nextSelection,
      isDirty: false,
    });
  },
  markSaved: () => {
    set({ isDirty: false });
  },
  updatePlanName: (name) => {
    const state = get();
    const trimmed = name.trimStart();
    if (trimmed === state.plan.name) return;

    set({
      plan: {
        ...state.plan,
        name: trimmed,
      },
      isDirty: true,
    });
  },
  updatePlanPairSidePreference: (preference) => {
    const state = get();
    if (state.plan.pairSidePreference === preference) return;

    set({
      plan: {
        ...state.plan,
        pairSidePreference: preference,
      },
      isDirty: true,
    });
  },
  addTable: (type = "rectangle", labelPrefix = "Table") => {
    const state = get();
    const nextTable = getNextTable(state.plan.tables.length, type, labelPrefix);

    set({
      plan: {
        ...state.plan,
        tables: [...state.plan.tables, nextTable],
      },
      selection: { type: "table", tableId: nextTable.id },
      isDirty: true,
    });
  },
  selectGuest: (guestId) => {
    set({
      selection: guestId ? { type: "guest", guestId } : null,
    });
  },
  selectTable: (tableId) => {
    set({
      selection: tableId ? { type: "table", tableId } : null,
    });
  },
  selectSeat: (tableId, seatNumber) => {
    set({
      selection: { type: "seat", tableId, seatNumber },
    });
  },
  clearSelection: () => {
    set({ selection: null });
  },
  updateSelectedTableLabel: (label) => {
    const state = get();
    if (state.selection?.type !== "table") return;
    const selectedTableId = state.selection.tableId;

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === selectedTableId ? { ...table, label } : table,
        ),
      },
      isDirty: true,
    });
  },
  updateSelectedTableSeatCount: (seatCount) => {
    const state = get();
    if (state.selection?.type !== "table") return;
    const selectedTableId = state.selection.tableId;

    const boundedSeatCount = Math.min(50, Math.max(1, Math.floor(seatCount)));

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === selectedTableId
            ? { ...table, seatCount: boundedSeatCount }
            : table,
        ),
      },
      isDirty: true,
    });
  },
  updateSelectedTableSeatLayout: (seatLayout) => {
    const state = get();
    if (state.selection?.type !== "table") return;
    const selectedTableId = state.selection.tableId;

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === selectedTableId ? { ...table, seatLayout } : table,
        ),
      },
      isDirty: true,
    });
  },
  rotateSelectedTable: () => {
    const state = get();
    if (state.selection?.type !== "table") return;
    const selectedTableId = state.selection.tableId;

    set({
      plan: {
        ...state.plan,
        tables: state.plan.tables.map((table) =>
          table.id === selectedTableId
            ? { ...table, rotation: (table.rotation + 90) % 360 }
            : table,
        ),
      },
      isDirty: true,
    });
  },
  deleteSelectedTable: () => {
    const state = get();
    if (state.selection?.type !== "table") return;
    const selectedTableId = state.selection.tableId;

    const nextTables = state.plan.tables.filter(
      (table) => table.id !== selectedTableId,
    );

    set({
      plan: {
        ...state.plan,
        tables: nextTables,
      },
      selection: null,
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
                x: snapToGrid(nextX),
                y: snapToGrid(nextY),
              }
            : table,
        ),
      },
      isDirty: true,
    });
  },
}));
