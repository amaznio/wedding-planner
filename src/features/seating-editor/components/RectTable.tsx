import { useRef } from "react";

import { getSeatPositions } from "../lib/seat-positioning";
import { getRectangleTableDimensions } from "../lib/table-dimensions";
import type { SeatingTable } from "../types/seating-plan.types";
import { useI18n } from "@/i18n/provider";
import { Seat } from "./Seat";

type RectTableProps = {
  table: SeatingTable;
  isSelected?: boolean;
  onSelect?: (tableId: string) => void;
  onMove?: (tableId: string, nextX: number, nextY: number) => void;
  screenToCanvas?: (clientX: number, clientY: number) => { x: number; y: number };
  seatOccupants?: Record<number, { guestId: string; guestName: string }>;
  selectedGuestId?: string | null;
  selectedSeatNumber?: number | null;
  conflictSeatNumber?: number | null;
  dropTargetSeatNumber?: number | null;
  linkedDropPreviewSeatNumbers?: number[];
  isDragActive?: boolean;
  enableTableDrag?: boolean;
  enableSeatDrag?: boolean;
  onSeatClick?: (tableId: string, seatNumber: number, clientX: number, clientY: number) => void;
  onSeatDragEnter?: (tableId: string, seatNumber: number) => void;
  onSeatDragLeave?: (tableId: string, seatNumber: number) => void;
  onSeatDrop?: (tableId: string, seatNumber: number, guestId: string) => void;
  onSeatGuestDragStart?: (guestId: string) => void;
  onSeatGuestDragEnd?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
};

export function RectTable({
  table,
  isSelected = false,
  onSelect,
  onMove,
  screenToCanvas,
  seatOccupants,
  selectedGuestId,
  selectedSeatNumber,
  conflictSeatNumber,
  dropTargetSeatNumber,
  linkedDropPreviewSeatNumbers = [],
  isDragActive = false,
  enableTableDrag = true,
  enableSeatDrag = false,
  onSeatClick,
  onSeatDragEnter,
  onSeatDragLeave,
  onSeatDrop,
  onSeatGuestDragStart,
  onSeatGuestDragEnd,
  onDragStateChange,
}: RectTableProps) {
  const { t } = useI18n();
  const dimensions = getRectangleTableDimensions(table.seatCount, table.seatLayout);
  const seatPositions = getSeatPositions(
    table.seatCount,
    dimensions.width,
    dimensions.height,
    table.seatLayout,
  );
  const occupiedSeatCount = Object.keys(seatOccupants ?? {}).length;
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedDuringDragRef = useRef(false);
  const suppressClickRef = useRef(false);

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
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            onSelect?.(table.id);
          }}
          onPointerDown={(event) => {
            if (!enableTableDrag) return;
            event.preventDefault();
            event.stopPropagation();

            const target = event.currentTarget;
            target.setPointerCapture(event.pointerId);
            const point = screenToCanvas
              ? screenToCanvas(event.clientX, event.clientY)
              : { x: event.clientX, y: event.clientY };
            dragOffsetRef.current = {
              x: point.x - table.x,
              y: point.y - table.y,
            };
            pointerStartRef.current = { x: point.x, y: point.y };
            movedDuringDragRef.current = false;
            onDragStateChange?.(true);
          }}
          onPointerMove={(event) => {
            if (!enableTableDrag) return;
            if (!dragOffsetRef.current) return;
            event.preventDefault();

            const point = screenToCanvas
              ? screenToCanvas(event.clientX, event.clientY)
              : { x: event.clientX, y: event.clientY };

            const nextX = point.x - dragOffsetRef.current.x;
            const nextY = point.y - dragOffsetRef.current.y;
            if (pointerStartRef.current) {
              const movedX = Math.abs(point.x - pointerStartRef.current.x);
              const movedY = Math.abs(point.y - pointerStartRef.current.y);
              if (movedX > 2 || movedY > 2) {
                movedDuringDragRef.current = true;
              }
            }
            onMove?.(table.id, nextX, nextY);
          }}
          onPointerUp={(event) => {
            if (!enableTableDrag) return;
            dragOffsetRef.current = null;
            pointerStartRef.current = null;
            suppressClickRef.current = movedDuringDragRef.current;
            movedDuringDragRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            onDragStateChange?.(false);
          }}
          onPointerCancel={() => {
            if (!enableTableDrag) return;
            dragOffsetRef.current = null;
            pointerStartRef.current = null;
            suppressClickRef.current = true;
            movedDuringDragRef.current = false;
            onDragStateChange?.(false);
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
          <div className="flex h-full flex-col items-center justify-center gap-1 text-zinc-700">
            <span className="text-sm font-semibold">{table.label}</span>
            <span className="text-xs text-zinc-500">
              {t("table.occupied", { occupied: occupiedSeatCount, total: table.seatCount })}
            </span>
          </div>
        </div>

        {seatPositions.map((seat) => (
          <Seat
            key={seat.seatNumber}
            seatNumber={seat.seatNumber}
            x={seat.x}
            y={seat.y}
            occupantGuestId={seatOccupants?.[seat.seatNumber]?.guestId ?? null}
            occupantName={seatOccupants?.[seat.seatNumber]?.guestName ?? null}
            isSelectedGuestSeat={
              seatOccupants?.[seat.seatNumber]?.guestId === selectedGuestId
            }
            isSelected={selectedSeatNumber === seat.seatNumber}
            isConflict={conflictSeatNumber === seat.seatNumber}
            isDropTarget={dropTargetSeatNumber === seat.seatNumber}
            isLinkedDropPreview={linkedDropPreviewSeatNumbers.includes(seat.seatNumber)}
            isDragActive={isDragActive}
            enableSeatDrag={enableSeatDrag}
            onClick={(seatNumber, clientX, clientY) =>
              onSeatClick?.(table.id, seatNumber, clientX, clientY)
            }
            onDragEnter={(seatNumber) => onSeatDragEnter?.(table.id, seatNumber)}
            onDragLeave={(seatNumber) => onSeatDragLeave?.(table.id, seatNumber)}
            onDropGuest={(seatNumber, guestId) =>
              onSeatDrop?.(table.id, seatNumber, guestId)
            }
            onSeatGuestDragStart={onSeatGuestDragStart}
            onSeatGuestDragEnd={onSeatGuestDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
