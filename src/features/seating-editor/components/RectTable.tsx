import { useRef } from "react";

import { getSeatPositions } from "../lib/seat-positioning";
import { getRectangleTableDimensions } from "../lib/table-dimensions";
import type { SeatingTable } from "../types/seating-plan.types";
import { Seat } from "./Seat";

type RectTableProps = {
  table: SeatingTable;
  isSelected?: boolean;
  onSelect?: (tableId: string) => void;
  onMove?: (tableId: string, nextX: number, nextY: number) => void;
  screenToCanvas?: (clientX: number, clientY: number) => { x: number; y: number };
};

export function RectTable({
  table,
  isSelected = false,
  onSelect,
  onMove,
  screenToCanvas,
}: RectTableProps) {
  const dimensions = getRectangleTableDimensions(table.seatCount);
  const seatPositions = getSeatPositions(
    table.seatCount,
    dimensions.width,
    dimensions.height,
  );
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      data-table-root="true"
      className="absolute"
      style={{
        left: table.x,
        top: table.y,
        transform: `rotate(${table.rotation}deg)`,
        transformOrigin: "center",
      }}
    >
      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <div
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(table.id);
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.(table.id);

            const target = event.currentTarget;
            target.setPointerCapture(event.pointerId);
            const point = screenToCanvas
              ? screenToCanvas(event.clientX, event.clientY)
              : { x: event.clientX, y: event.clientY };
            dragOffsetRef.current = {
              x: point.x - table.x,
              y: point.y - table.y,
            };
          }}
          onPointerMove={(event) => {
            if (!dragOffsetRef.current) return;
            event.preventDefault();

            const point = screenToCanvas
              ? screenToCanvas(event.clientX, event.clientY)
              : { x: event.clientX, y: event.clientY };

            const nextX = point.x - dragOffsetRef.current.x;
            const nextY = point.y - dragOffsetRef.current.y;
            onMove?.(table.id, nextX, nextY);
          }}
          onPointerUp={(event) => {
            dragOffsetRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragOffsetRef.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onSelect?.(table.id);
            }
          }}
          className={`h-full w-full rounded-md border bg-zinc-100 shadow-sm transition-shadow ${
            isSelected
              ? "border-rose-500 ring-2 ring-rose-200 shadow-md shadow-rose-100"
              : "border-zinc-300 hover:shadow-md"
          }`}
        >
          <div className="flex h-full items-center justify-center text-sm font-semibold text-zinc-700">
            {table.label}
          </div>
        </div>

        {seatPositions.map((seat) => (
          <Seat key={seat.seatNumber} seatNumber={seat.seatNumber} x={seat.x} y={seat.y} />
        ))}
      </div>
    </div>
  );
}
