import type { PointerEvent, WheelEvent } from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { getSeatPositions } from "../lib/seat-positioning";
import { getRectangleTableDimensions } from "../lib/table-dimensions";
import type { SeatingPlan } from "../types/seating-plan.types";
import { RectTable } from "./RectTable";

type SeatingCanvasProps = {
  plan: SeatingPlan;
  selectedTableId?: string;
  selectedSeat?: { tableId: string; seatNumber: number } | null;
  onSelectTable?: (tableId: string | null) => void;
  onSelectSeat?: (tableId: string, seatNumber: number) => void;
  onMoveTable?: (tableId: string, nextX: number, nextY: number) => void;
  seatAssignments?: Record<
    string,
    Record<number, { guestId: string; guestName: string }>
  >;
  tableLabelById?: Record<string, string>;
  selectedGuestId?: string | null;
  guests?: Array<{
    id: string;
    name: string;
    assignment: { tableId: string; seatNumber: number } | null;
  }>;
  onSeatAssign?: (
    tableId: string,
    seatNumber: number,
    guestId: string | null,
  ) => Promise<{ message?: string; level?: "info" | "success" }>;
  onTableDragStateChange?: (isDragging: boolean) => void;
  onAddTable?: () => void;
  mobileMode?: boolean;
  enableTableDrag?: boolean;
  onToggleTableDrag?: () => void;
  onViewChange?: (next: { scale: number; x: number; y: number }) => void;
  draggedGuestId?: string | null;
  isDraggingGuest?: boolean;
  enableSeatDrag?: boolean;
  onSeatGuestDragStart?: (guestId: string) => void;
  onSeatGuestDragEnd?: () => void;
  onGuestDropToSeat?: (
    tableId: string,
    seatNumber: number,
    guestId: string,
  ) => Promise<void> | void;
};

export type SeatingCanvasHandle = {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export const SeatingCanvas = forwardRef<SeatingCanvasHandle, SeatingCanvasProps>(function SeatingCanvas({
  plan,
  selectedTableId,
  onSelectTable,
  onMoveTable,
  seatAssignments,
  tableLabelById = {},
  selectedGuestId,
  guests = [],
  onSeatAssign,
  selectedSeat,
  onSelectSeat,
  onTableDragStateChange,
  onAddTable,
  mobileMode = false,
  enableTableDrag = true,
  onToggleTableDrag,
  onViewChange,
  draggedGuestId = null,
  isDraggingGuest = false,
  enableSeatDrag = false,
  onSeatGuestDragStart,
  onSeatGuestDragEnd,
  onGuestDropToSeat,
}, ref) {
  const [draggedSeatGuestId, setDraggedSeatGuestId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activeTouchPointersRef = useRef<
    Map<number, { clientX: number; clientY: number }>
  >(new Map());
  const pinchSessionRef = useRef<{
    startDistance: number;
    startScale: number;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressCanvasClickRef = useRef(false);
  const panSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [seatMenu, setSeatMenu] = useState<{
    tableId: string;
    seatNumber: number;
    x: number;
    y: number;
  } | null>(null);
  const [isAssigningSeat, setIsAssigningSeat] = useState(false);
  const [seatMenuError, setSeatMenuError] = useState<string | null>(null);
  const [conflictSeat, setConflictSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const [dragHoverSeat, setDragHoverSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false);
  const centeredPlanIdRef = useRef<string | null>(null);

  const getFitView = (): { scale: number; x: number; y: number } | null => {
    const viewport = viewportRef.current;
    if (!viewport || !plan.tables.length) return null;
    const viewportRect = viewport.getBoundingClientRect();
    if (viewportRect.width <= 0 || viewportRect.height <= 0) return null;

    const padding = mobileMode
      ? { top: 24, right: 24, bottom: 24, left: 24 }
      : { top: 68, right: 28, bottom: 28, left: 28 };
    const availableWidth = Math.max(1, viewportRect.width - padding.left - padding.right);
    const availableHeight = Math.max(1, viewportRect.height - padding.top - padding.bottom);

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const table of plan.tables) {
      const { width, height } = getRectangleTableDimensions(table.seatCount, table.seatLayout);
      const seatPositions = getSeatPositions(table.seatCount, width, height, table.seatLayout);
      const centerX = table.x + width / 2;
      const centerY = table.y + height / 2;
      const radians = (table.rotation * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      const corners = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
      ];

      for (const corner of corners) {
        const rotatedX = centerX + corner.x * cos - corner.y * sin;
        const rotatedY = centerY + corner.x * sin + corner.y * cos;
        minX = Math.min(minX, rotatedX);
        minY = Math.min(minY, rotatedY);
        maxX = Math.max(maxX, rotatedX);
        maxY = Math.max(maxY, rotatedY);
      }

      const seatRadius = 18;
      for (const seat of seatPositions) {
        const localX = seat.x - width / 2;
        const localY = seat.y - height / 2;
        const rotatedSeatX = centerX + localX * cos - localY * sin;
        const rotatedSeatY = centerY + localX * sin + localY * cos;
        minX = Math.min(minX, rotatedSeatX - seatRadius);
        minY = Math.min(minY, rotatedSeatY - seatRadius);
        maxX = Math.max(maxX, rotatedSeatX + seatRadius);
        maxY = Math.max(maxY, rotatedSeatY + seatRadius);
      }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const fitScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
    const nextScale = Math.max(getMinScale(), Math.min(2.5, fitScale));

    const targetCenterX = padding.left + availableWidth / 2;
    const targetCenterY = padding.top + availableHeight / 2;
    return {
      scale: nextScale,
      x: targetCenterX - contentCenterX * nextScale,
      y: targetCenterY - contentCenterY * nextScale,
    };
  };
  const screenToCanvas = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: clientX, y: clientY };
    }

    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };
  const getMinScale = () => {
    if (typeof window === "undefined") return 0.5;
    const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;
    return isMobileViewport ? 0.25 : 0.5;
  };
  const getTouchDistance = (
    first: { clientX: number; clientY: number },
    second: { clientX: number; clientY: number },
  ) => {
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    return Math.hypot(dx, dy);
  };
  const getTouchMidpoint = (
    first: { clientX: number; clientY: number },
    second: { clientX: number; clientY: number },
  ) => ({
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  });
  const stopPanSession = (pointerId?: number) => {
    const session = panSessionRef.current;
    if (!session) return;
    if (pointerId !== undefined && session.pointerId !== pointerId) return;
    const viewport = viewportRef.current;
    if (pointerId !== undefined && viewport && viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    panSessionRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const minScale = getMinScale();
    const nextScale = Math.max(
      minScale,
      Math.min(2.5, view.scale * zoomFactor),
    );

    const worldX = (mouseX - view.x) / view.scale;
    const worldY = (mouseY - view.y) / view.scale;

    const nextView = {
      scale: nextScale,
      x: mouseX - worldX * nextScale,
      y: mouseY - worldY * nextScale,
    };
    setView(nextView);
    onViewChange?.(nextView);
  };
  const applyView = (next: { scale: number; x: number; y: number }) => {
    setView(next);
    onViewChange?.(next);
  };
  const zoomIn = () =>
    applyView({
      ...view,
      scale: Math.min(2.5, view.scale * 1.1),
    });
  const zoomOut = () =>
    applyView({
      ...view,
      scale: Math.max(getMinScale(), view.scale * 0.9),
    });
  const resetView = () => {
    const centeredView = getFitView();
    applyView(centeredView ?? { scale: 1, x: 0, y: 0 });
  };
  useImperativeHandle(ref, () => ({
    resetView,
    zoomIn,
    zoomOut,
  }));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-table-root='true']")) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.setPointerCapture(event.pointerId);
    setSeatMenu(null);
    if (event.pointerType === "touch") {
      activeTouchPointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      if (activeTouchPointersRef.current.size >= 2) {
        const touches = Array.from(activeTouchPointersRef.current.values());
        const first = touches[0];
        const second = touches[1];
        const startDistance = getTouchDistance(first, second);
        if (startDistance > 0) {
          pinchSessionRef.current = {
            startDistance,
            startScale: view.scale,
            startX: view.x,
            startY: view.y,
          };
          stopPanSession();
        }
      }
    }
    if (pinchSessionRef.current) return;
    panSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && activeTouchPointersRef.current.has(event.pointerId)) {
      activeTouchPointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    if (pinchSessionRef.current && activeTouchPointersRef.current.size >= 2) {
      const touches = Array.from(activeTouchPointersRef.current.values());
      const first = touches[0];
      const second = touches[1];
      const midpoint = getTouchMidpoint(first, second);
      const currentDistance = getTouchDistance(first, second);
      if (currentDistance > 0) {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const midX = midpoint.clientX - rect.left;
        const midY = midpoint.clientY - rect.top;
        const pinchSession = pinchSessionRef.current;
        const nextScale = Math.max(
          getMinScale(),
          Math.min(2.5, pinchSession.startScale * (currentDistance / pinchSession.startDistance)),
        );
        const worldX = (midX - pinchSession.startX) / pinchSession.startScale;
        const worldY = (midY - pinchSession.startY) / pinchSession.startScale;
        const nextView = {
          scale: nextScale,
          x: midX - worldX * nextScale,
          y: midY - worldY * nextScale,
        };
        setView(nextView);
        onViewChange?.(nextView);
        suppressCanvasClickRef.current = true;
      }
      return;
    }

    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    const moved = Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2;
    session.moved = session.moved || moved;

    const nextView = {
      ...view,
      x: session.originX + deltaX,
      y: session.originY + deltaY,
    };
    setView(nextView);
    onViewChange?.(nextView);
  };

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      activeTouchPointersRef.current.delete(event.pointerId);
      if (pinchSessionRef.current && activeTouchPointersRef.current.size < 2) {
        pinchSessionRef.current = null;
      }
    }
    stopPanSession(event.pointerId);
  };

  const handleCanvasClick = () => {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false;
      return;
    }
    const session = panSessionRef.current;
    if (session?.moved) return;
    setSeatMenu(null);
    onSelectTable?.(null);
  };

  const handleSeatClick = (
    tableId: string,
    seatNumber: number,
    clientX: number,
    clientY: number,
  ) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const menuWidth = 280;
    const menuHeight = 320;
    const x = Math.max(
      12,
      Math.min(clientX - rect.left + 12, rect.width - menuWidth - 12),
    );
    const y = Math.max(
      12,
      Math.min(clientY - rect.top + 12, rect.height - menuHeight - 12),
    );
    setSeatMenuError(null);
    setConflictSeat(null);
    setSeatMenu({ tableId, seatNumber, x, y });
    onSelectSeat?.(tableId, seatNumber);
  };

  const menuSeatAssignment = seatMenu
    ? (seatAssignments?.[seatMenu.tableId]?.[seatMenu.seatNumber] ?? null)
    : null;
  const effectiveDraggedGuestId = draggedGuestId ?? draggedSeatGuestId;
  const isAnyGuestDragActive = isDraggingGuest || draggedSeatGuestId !== null;
  const totalSeats = plan.tables.reduce((sum, table) => sum + table.seatCount, 0);
  const filledSeats = Object.values(seatAssignments ?? {}).reduce(
    (sum, tableSeats) => sum + Object.keys(tableSeats).length,
    0,
  );

  useEffect(() => {
    if (centeredPlanIdRef.current === plan.id) return;
    const centeredView = getFitView();
    if (!centeredView) return;
    applyView(centeredView);
    centeredPlanIdRef.current = plan.id;
  }, [mobileMode, plan.id, plan.tables]);

  return (
    <section className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div
        ref={viewportRef}
        className="relative h-full min-h-0 w-full select-none"
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        style={{
          touchAction: "none",
          cursor: isPanning ? "grabbing" : "grab",
          userSelect: "none",
          backgroundImage:
            "linear-gradient(to right, rgba(24,24,27,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div
          className="absolute right-3 top-3 z-20 hidden lg:block"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-10 px-4 text-sm">
                Add Object
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddTable}>Rectangular table</DropdownMenuItem>
              <DropdownMenuItem disabled>Round table (coming soon)</DropdownMenuItem>
              <DropdownMenuItem disabled>Buffet (coming soon)</DropdownMenuItem>
              <DropdownMenuItem disabled>Dance floor (coming soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!mobileMode ? (
          <div className="absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 lg:block">
            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200/90 bg-white/95 px-3 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
              Seats {filledSeats}/{totalSeats}
            </span>
          </div>
        ) : null}
        {!mobileMode ? (
          <div
            className="absolute bottom-3 right-3 z-20 flex select-none items-center gap-2 rounded-xl border border-zinc-200/90 bg-white/95 px-2 py-2 text-xs shadow-md backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-2.5 text-[11px] font-medium"
              onClick={resetView}
            >
              {Math.round(view.scale * 100)}%
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 min-w-8 rounded-lg px-2 text-xs"
              onClick={() =>
                zoomIn()
              }
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 min-w-8 rounded-lg px-2 text-xs"
              onClick={() =>
                zoomOut()
              }
            >
              -
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs font-medium"
              onClick={resetView}
            >
              Reset
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs font-medium">
                  Legend
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-800">Seat legend</p>
                <div className="space-y-1 text-xs text-zinc-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                    <span>Selected guest</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-100" />
                    <span>Selected seat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-300 bg-blue-50" />
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white" />
                    <span>Empty</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
        {mobileMode ? (
          <div
            className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-full bg-white px-2.5 text-xs"
                onClick={resetView}
              >
                <span>{Math.round(view.scale * 100)}%</span>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </Button>
              <Button
                type="button"
                variant={enableTableDrag ? "default" : "outline"}
                className="h-8 rounded-full px-2.5 text-xs"
                onClick={onToggleTableDrag}
              >
                Move tables
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 rounded-full bg-white p-0"
              aria-label="Info"
              onClick={() => setMobileLegendOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </Button>
          </div>
        ) : null}
        <Drawer open={mobileLegendOpen} onOpenChange={setMobileLegendOpen}>
          <DrawerContent className="p-4">
            <DrawerTitle className="sr-only">Seat legend</DrawerTitle>
            <p className="mb-2 text-sm font-semibold text-zinc-800">Seat legend</p>
            <div className="space-y-2 text-sm text-zinc-600">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                <span>Selected guest</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-100" />
                <span>Selected seat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-300 bg-blue-50" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white" />
                <span>Empty</span>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        <div
          className="absolute left-0 top-0 rounded-md"
          style={{
            width: plan.width,
            height: plan.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "top left",
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
              seatOccupants={seatAssignments?.[table.id]}
              selectedGuestId={selectedGuestId}
              conflictSeatNumber={
                conflictSeat?.tableId === table.id
                  ? conflictSeat.seatNumber
                  : null
              }
              dropTargetSeatNumber={
                dragHoverSeat?.tableId === table.id
                  ? dragHoverSeat.seatNumber
                  : null
              }
              isDragActive={isAnyGuestDragActive}
              enableTableDrag={enableTableDrag}
              enableSeatDrag={enableSeatDrag}
              selectedSeatNumber={
                selectedSeat?.tableId === table.id ? selectedSeat.seatNumber : null
              }
              onSeatClick={handleSeatClick}
              onDragStateChange={(isDragging) => {
                if (isDragging) {
                  setSeatMenu(null);
                }
                onTableDragStateChange?.(isDragging);
              }}
              onSeatDragEnter={(tableId, seatNumber) => {
                if (!isAnyGuestDragActive) return;
                setDragHoverSeat({ tableId, seatNumber });
              }}
              onSeatDragLeave={(tableId, seatNumber) => {
                if (
                  dragHoverSeat?.tableId === tableId &&
                  dragHoverSeat?.seatNumber === seatNumber
                ) {
                  setDragHoverSeat(null);
                }
              }}
              onSeatDrop={async (tableId, seatNumber, guestId) => {
                setDragHoverSeat(null);
                if (!isAnyGuestDragActive) return;
                const effectiveGuestId = guestId || effectiveDraggedGuestId;
                if (!effectiveGuestId) return;
                await onGuestDropToSeat?.(tableId, seatNumber, effectiveGuestId);
                setDraggedSeatGuestId(null);
                onSeatGuestDragEnd?.();
              }}
              onSeatGuestDragStart={(guestId) => {
                setSeatMenu(null);
                setDraggedSeatGuestId(guestId);
                onSeatGuestDragStart?.(guestId);
              }}
              onSeatGuestDragEnd={() => {
                setDraggedSeatGuestId(null);
                setDragHoverSeat(null);
                onSeatGuestDragEnd?.();
              }}
              screenToCanvas={screenToCanvas}
            />
          ))}
        </div>
        {plan.tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-md border border-dashed border-zinc-300 bg-white/80 px-4 py-3 text-sm text-zinc-600">
              No tables yet. Use <span className="font-medium">Add Table</span>{" "}
              to start.
            </div>
          </div>
        ) : null}
        {seatMenu ? (
          <div
            className="absolute z-40 w-[280px] rounded-xl border border-zinc-300 bg-white/95 p-3 shadow-xl backdrop-blur"
            style={{ left: seatMenu.x, top: seatMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-zinc-900">
                Seat {seatMenu.seatNumber}
              </h4>
              <button
                type="button"
                onClick={() => setSeatMenu(null)}
                className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <p className="mb-2 text-xs text-zinc-600">
              Current: {menuSeatAssignment?.guestName ?? "Unassigned"}
            </p>
            {seatMenuError ? (
              <div className="mb-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
                {seatMenuError}
              </div>
            ) : null}
            <div className="mb-2 max-h-52 space-y-1 overflow-auto rounded-md border border-zinc-200 p-1">
              {guests.map((guest) => {
                const isCurrent = menuSeatAssignment?.guestId === guest.id;
                const assignmentLabel = guest.assignment
                  ? `${tableLabelById[guest.assignment.tableId] ?? "Table"} • Seat ${guest.assignment.seatNumber}`
                  : "Unseated";
                return (
                  <button
                    key={guest.id}
                    type="button"
                    disabled={isAssigningSeat}
                    onClick={async () => {
                      setIsAssigningSeat(true);
                      try {
                        setSeatMenuError(null);
                        setConflictSeat(null);
                        const result = await onSeatAssign?.(
                          seatMenu.tableId,
                          seatMenu.seatNumber,
                          guest.id,
                        );
                        if (result?.message) {
                          toast({
                            variant:
                              result.level === "info" ? "info" : "success",
                            title: result.level === "info" ? "Info" : "Success",
                            description: result.message,
                          });
                        }
                        setSeatMenu(null);
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : "Failed to assign seat";
                        setSeatMenuError(message);
                        setConflictSeat({
                          tableId: seatMenu.tableId,
                          seatNumber: seatMenu.seatNumber,
                        });
                      } finally {
                        setIsAssigningSeat(false);
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 ${
                      isCurrent ? "bg-zinc-100 font-medium" : ""
                    }`}
                  >
                    <span className="truncate text-zinc-800">{guest.name}</span>
                    <span className="ml-2 text-zinc-500">
                      {assignmentLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!menuSeatAssignment || isAssigningSeat}
              onClick={async () => {
                if (!menuSeatAssignment) return;
                setIsAssigningSeat(true);
                try {
                  setSeatMenuError(null);
                  setConflictSeat(null);
                  const result = await onSeatAssign?.(
                    seatMenu.tableId,
                    seatMenu.seatNumber,
                    null,
                  );
                  if (result?.message) {
                    toast({
                      variant: result.level === "info" ? "info" : "success",
                      title: result.level === "info" ? "Info" : "Success",
                      description: result.message,
                    });
                  }
                  setSeatMenu(null);
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to unassign seat";
                  setSeatMenuError(message);
                  setConflictSeat({
                    tableId: seatMenu.tableId,
                    seatNumber: seatMenu.seatNumber,
                  });
                } finally {
                  setIsAssigningSeat(false);
                }
              }}
              className="w-full rounded-md border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Unassign Seat
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
});
