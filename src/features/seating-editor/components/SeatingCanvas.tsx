import type { SeatingPlan } from "../types/seating-plan.types";
import { RectTable } from "./RectTable";

type SeatingCanvasProps = {
  plan: SeatingPlan;
  selectedTableId?: string;
  onSelectTable?: (tableId: string | null) => void;
  onMoveTable?: (tableId: string, nextX: number, nextY: number) => void;
};

export function SeatingCanvas({
  plan,
  selectedTableId,
  onSelectTable,
  onMoveTable,
}: SeatingCanvasProps) {
  return (
    <section className="flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white p-4">
      <div
        className="relative rounded-md border border-zinc-200"
        onClick={() => onSelectTable?.(null)}
        style={{
          width: plan.width,
          height: plan.height,
          backgroundImage:
            "linear-gradient(to right, rgba(24,24,27,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {plan.tables.map((table) => (
          <RectTable
            key={table.id}
            table={table}
            isSelected={selectedTableId === table.id}
            onSelect={(tableId) => onSelectTable?.(tableId)}
            onMove={(tableId, nextX, nextY) =>
              onMoveTable?.(tableId, nextX, nextY)
            }
          />
        ))}
      </div>
    </section>
  );
}
