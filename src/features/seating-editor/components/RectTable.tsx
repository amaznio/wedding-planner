import { memo, useRef, useState } from "react";

import { getTableSeatPositions } from "../lib/seat-positioning";
import { getTableDimensions } from "../lib/table-dimensions";
import type { SeatingTable } from "../types/seating-plan.types";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { Seat } from "./Seat";

type RectTableProps = {
  presentation?: "editor" | "preview";
  table: SeatingTable;
  isSelected?: boolean;
  showOccupancy?: boolean;
  onSelect?: (tableId: string) => void;
  onMove?: (tableId: string, nextX: number, nextY: number) => void;
  screenToCanvas?: (
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };
  seatOccupants?: Record<
    number,
    {
      guestId: string;
      guestName: string;
      guestGroupColor: string | null;
      guestGroupName: string | null;
    }
  >;
  selectedGuestId?: string | null;
  showGroupColors?: boolean;
  selectedSeatNumber?: number | null;
  conflictSeatNumber?: number | null;
  dropTargetSeatNumber?: number | null;
  linkedDropPreviewSeatNumbers?: number[];
  highlightedSeatNumbers?: number[];
  isDragActive?: boolean;
  enableTableDrag?: boolean;
  enableSeatDrag?: boolean;
  showHoverSeatNames?: boolean;
  onSeatClick?: (
    tableId: string,
    seatNumber: number,
    clientX: number,
    clientY: number,
  ) => void;
  onSeatDragEnter?: (tableId: string, seatNumber: number) => void;
  onSeatDragLeave?: (tableId: string, seatNumber: number) => void;
  onSeatDrop?: (tableId: string, seatNumber: number, guestId: string) => void;
  onSeatGuestDragStart?: (guestId: string) => void;
  onSeatGuestDragEnd?: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
};

function RectTableComponent({
  presentation = "editor",
  table,
  isSelected = false,
  showOccupancy = true,
  onSelect,
  onMove,
  screenToCanvas,
  seatOccupants,
  selectedGuestId,
  showGroupColors = false,
  selectedSeatNumber,
  conflictSeatNumber,
  dropTargetSeatNumber,
  linkedDropPreviewSeatNumbers = [],
  highlightedSeatNumbers = [],
  isDragActive = false,
  enableTableDrag = true,
  enableSeatDrag = false,
  showHoverSeatNames = false,
  onSeatClick,
  onSeatDragEnter,
  onSeatDragLeave,
  onSeatDrop,
  onSeatGuestDragStart,
  onSeatGuestDragEnd,
  onDragStateChange,
}: RectTableProps) {
  const { t } = useI18n();
  const isPreview = presentation === "preview";
  const dimensions = getTableDimensions(table);
  const seatPositions = getTableSeatPositions(table);
  const occupiedSeatCount = Object.keys(seatOccupants ?? {}).length;
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedDuringDragRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-table-root="true"
      className="absolute"
      onPointerEnter={() => {
        if (!showHoverSeatNames) return;
        setIsHovered(true);
      }}
      onPointerLeave={() => {
        if (!showHoverSeatNames) return;
        setIsHovered(false);
      }}
      style={{
        left: table.x,
        top: table.y,
        transform: `rotate(${table.rotation}deg)`,
        transformOrigin: "center",
        zIndex: showHoverSeatNames && isHovered ? 80 : isSelected ? 30 : 1,
      }}
    >
      <div
        className="relative"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
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
          className={cn(
            "h-full w-full border shadow-sm transition-shadow",
            table.type === "circle" ? "rounded-full" : "rounded-md",
            isPreview
              ? "cursor-grab touch-none border-violet-200 bg-white/95 text-zinc-900 shadow-[0_6px_14px_rgba(124,58,237,0.12)] active:cursor-grabbing"
              : "bg-zinc-100",
            !isPreview && isSelected
              ? "border-rose-500 ring-2 ring-rose-200 shadow-md shadow-rose-100"
              : null,
            !isPreview && !isSelected ? "border-zinc-300 hover:shadow-md" : null,
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col items-center justify-center text-zinc-700",
              isPreview ? "gap-0 text-zinc-900" : "gap-1",
            )}
          >
            <span className={cn("font-semibold", isPreview ? "text-base" : "text-sm")}>
              {table.label}
            </span>
            {showOccupancy ? (
              <span className="text-xs text-zinc-500">
                {t("table.occupied", {
                  occupied: occupiedSeatCount,
                  total: table.seatCount,
                })}
              </span>
            ) : null}
          </div>
        </div>

        {seatPositions.map((seat) => (
          <Seat
            key={seat.seatNumber}
            presentation={presentation}
            seatNumber={seat.seatNumber}
            x={seat.x}
            y={seat.y}
            occupantGuestId={seatOccupants?.[seat.seatNumber]?.guestId ?? null}
            occupantName={seatOccupants?.[seat.seatNumber]?.guestName ?? null}
            occupantGroupColor={
              seatOccupants?.[seat.seatNumber]?.guestGroupColor ?? null
            }
            occupantGroupName={
              seatOccupants?.[seat.seatNumber]?.guestGroupName ?? null
            }
            showGroupColors={showGroupColors}
            isSelectedGuestSeat={
              seatOccupants?.[seat.seatNumber]?.guestId === selectedGuestId
            }
            isSelected={selectedSeatNumber === seat.seatNumber}
            isConflict={conflictSeatNumber === seat.seatNumber}
            isDropTarget={dropTargetSeatNumber === seat.seatNumber}
            isLinkedDropPreview={linkedDropPreviewSeatNumbers.includes(
              seat.seatNumber,
            )}
            isSearchMatch={highlightedSeatNumbers.includes(seat.seatNumber)}
            isDragActive={isDragActive}
            enableSeatDrag={enableSeatDrag}
            onClick={(seatNumber, clientX, clientY) =>
              onSeatClick?.(table.id, seatNumber, clientX, clientY)
            }
            onDragEnter={(seatNumber) =>
              onSeatDragEnter?.(table.id, seatNumber)
            }
            onDragLeave={(seatNumber) =>
              onSeatDragLeave?.(table.id, seatNumber)
            }
            onDropGuest={(seatNumber, guestId) =>
              onSeatDrop?.(table.id, seatNumber, guestId)
            }
            onSeatGuestDragStart={onSeatGuestDragStart}
            onSeatGuestDragEnd={onSeatGuestDragEnd}
          />
        ))}
        {showHoverSeatNames && isHovered ? (
          <div className="pointer-events-none absolute inset-0 z-[90]">
            {seatPositions.map((seat) => {
              const occupantName =
                seatOccupants?.[seat.seatNumber]?.guestName ?? null;
              if (!occupantName) return null;
              const centerX = dimensions.width / 2;
              const centerY = dimensions.height / 2;
              const dx = seat.x - centerX;
              const dy = seat.y - centerY;
              const distance = Math.hypot(dx, dy) || 1;
              const isTopSideSeat = seat.y <= centerY;
              const seatRadius = 18;
              const labelGap = table.type === "circle" ? 8 : 1;
              const labelX =
                table.type === "circle"
                  ? seat.x + (dx / distance) * (seatRadius + labelGap)
                  : seat.x;
              const labelY =
                table.type === "circle"
                  ? seat.y + (dy / distance) * (seatRadius + labelGap)
                  : isTopSideSeat
                    ? seat.y - seatRadius - labelGap
                    : seat.y + seatRadius + labelGap;
              const anchorTransform =
                table.type === "circle"
                  ? "translate(-50%, -50%)"
                  : isTopSideSeat
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)";

              return (
                <span
                  key={`seat-label-${seat.seatNumber}`}
                  className="absolute"
                  style={{
                    left: labelX,
                    top: labelY,
                    transform: anchorTransform,
                  }}
                  title={occupantName}
                >
                  <span
                    className={`inline-flex items-center rounded-md border border-zinc-300/90 bg-white/95 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-800 shadow-sm backdrop-blur ${
                      table.type === "circle"
                        ? "max-w-[96px]"
                        : "max-h-[140px] [writing-mode:vertical-rl] [text-orientation:mixed]"
                    }`}
                  >
                    <span className="truncate">{occupantName}</span>
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function areNumberArraysEqual(
  a: number[] | undefined,
  b: number[] | undefined,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function areSeatOccupantsEqual(
  prev: RectTableProps["seatOccupants"],
  next: RectTableProps["seatOccupants"],
) {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    const seatNumber = Number(key);
    const prevOccupant = prev[seatNumber];
    const nextOccupant = next[seatNumber];
    if (
      prevOccupant?.guestId !== nextOccupant?.guestId ||
      prevOccupant?.guestName !== nextOccupant?.guestName ||
      prevOccupant?.guestGroupColor !== nextOccupant?.guestGroupColor ||
      prevOccupant?.guestGroupName !== nextOccupant?.guestGroupName
    ) {
      return false;
    }
  }
  return true;
}

function areRectTablePropsEqual(prev: RectTableProps, next: RectTableProps) {
  return (
    prev.presentation === next.presentation &&
    prev.table.id === next.table.id &&
    prev.table.x === next.table.x &&
    prev.table.y === next.table.y &&
    prev.table.label === next.table.label &&
    prev.table.type === next.table.type &&
    prev.table.rotation === next.table.rotation &&
    prev.table.seatCount === next.table.seatCount &&
    prev.table.seatLayout === next.table.seatLayout &&
    prev.isSelected === next.isSelected &&
    prev.showOccupancy === next.showOccupancy &&
    prev.selectedGuestId === next.selectedGuestId &&
    prev.showGroupColors === next.showGroupColors &&
    prev.selectedSeatNumber === next.selectedSeatNumber &&
    prev.conflictSeatNumber === next.conflictSeatNumber &&
    prev.dropTargetSeatNumber === next.dropTargetSeatNumber &&
    prev.isDragActive === next.isDragActive &&
    prev.enableTableDrag === next.enableTableDrag &&
    prev.showHoverSeatNames === next.showHoverSeatNames &&
    prev.enableSeatDrag === next.enableSeatDrag &&
    areNumberArraysEqual(
      prev.linkedDropPreviewSeatNumbers,
      next.linkedDropPreviewSeatNumbers,
    ) &&
    areNumberArraysEqual(prev.highlightedSeatNumbers, next.highlightedSeatNumbers) &&
    areSeatOccupantsEqual(prev.seatOccupants, next.seatOccupants)
  );
}

export const RectTable = memo(RectTableComponent, areRectTablePropsEqual);
