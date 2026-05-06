import type { PointerEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { getRectangleTableDimensions } from "../lib/table-dimensions";
import type { SeatingPlan } from "../types/seating-plan.types";
import { RectTable } from "./RectTable";
import { TableFloatingEditor } from "./TableFloatingEditor";

type SeatingCanvasProps = {
  plan: SeatingPlan;
  selectedTableId?: string;
  onSelectTable?: (tableId: string | null) => void;
  onMoveTable?: (tableId: string, nextX: number, nextY: number) => void;
  seatAssignments?: Record<
    string,
    Record<number, { guestId: string; guestName: string }>
  >;
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
  onLabelChange?: (label: string) => void;
  onSeatCountChange?: (seatCount: number) => void;
  onRotate?: () => void;
  onDelete?: () => void;
};

export function SeatingCanvas({
  plan,
  selectedTableId,
  onSelectTable,
  onMoveTable,
  seatAssignments,
  selectedGuestId,
  guests = [],
  onSeatAssign,
  onLabelChange,
  onSeatCountChange,
  onRotate,
  onDelete,
}: SeatingCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
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
  const [viewportSize, setViewportSize] = useState({
    width: 1200,
    height: 800,
  });
  const [isDraggingTable, setIsDraggingTable] = useState(false);
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
  const [assignmentStatus, setAssignmentStatus] = useState<{
    level: "info" | "success";
    message: string;
  } | null>(null);
  const selectedTable =
    plan.tables.find((table) => table.id === selectedTableId) ?? null;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

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

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const isMobileViewport =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;
    const minScale = isMobileViewport ? 0.25 : 0.5;
    const nextScale = Math.max(
      minScale,
      Math.min(2.5, view.scale * zoomFactor),
    );

    const worldX = (mouseX - view.x) / view.scale;
    const worldY = (mouseY - view.y) / view.scale;

    setView({
      scale: nextScale,
      x: mouseX - worldX * nextScale,
      y: mouseY - worldY * nextScale,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-table-root='true']")) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.setPointerCapture(event.pointerId);
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
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    const moved = Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2;
    session.moved = session.moved || moved;

    setView((current) => ({
      ...current,
      x: session.originX + deltaX,
      y: session.originY + deltaY,
    }));
  };

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const viewport = viewportRef.current;
    if (viewport && viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    panSessionRef.current = null;
    setIsPanning(false);
  };

  const handleCanvasClick = () => {
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
  };

  const menuSeatAssignment = seatMenu
    ? (seatAssignments?.[seatMenu.tableId]?.[seatMenu.seatNumber] ?? null)
    : null;

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
          className="absolute left-3 top-3 z-20 flex select-none items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs shadow-sm"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="text-zinc-600">{Math.round(view.scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100"
          >
            Reset View
          </button>
        </div>
        {assignmentStatus ? (
          <div
            className={`absolute left-44 top-3 z-20 rounded-md border px-3 py-2 text-xs shadow-sm ${
              assignmentStatus.level === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-blue-300 bg-blue-50 text-blue-800"
            }`}
          >
            {assignmentStatus.message}
          </div>
        ) : null}
        <div
          className="absolute left-3 top-16 z-20 rounded-md border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-sm"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="mb-1 font-medium text-zinc-700">Seat legend</p>
          <div className="flex items-center gap-2 text-zinc-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
            <span>Selected guest</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-zinc-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-300 bg-blue-50" />
            <span>Occupied</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-zinc-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white" />
            <span>Empty</span>
          </div>
        </div>

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
              onSeatClick={handleSeatClick}
              onDragStateChange={setIsDraggingTable}
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
        {selectedTable && !isDraggingTable ? (
          <div
            className="absolute z-30"
            style={(() => {
              const dimensions = getRectangleTableDimensions(
                selectedTable.seatCount,
              );
              const editorWidth = 420;
              const editorHeight = 320;
              const viewportWidth = viewportSize.width;
              const viewportHeight = viewportSize.height;
              const anchorX =
                selectedTable.x * view.scale +
                view.x +
                dimensions.width * view.scale +
                20;
              const anchorY = selectedTable.y * view.scale + view.y;

              const clampedX = Math.max(
                12,
                Math.min(anchorX, viewportWidth - editorWidth - 12),
              );
              const clampedY = Math.max(
                12,
                Math.min(anchorY, viewportHeight - editorHeight - 12),
              );

              return { left: clampedX, top: clampedY };
            })()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <TableFloatingEditor
              selectedTable={selectedTable}
              onLabelChange={(label) => onLabelChange?.(label)}
              onSeatCountChange={(seatCount) => onSeatCountChange?.(seatCount)}
              onRotate={() => onRotate?.()}
              onDelete={() => onDelete?.()}
              onClose={() => onSelectTable?.(null)}
            />
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
                  ? `T:${guest.assignment.tableId.slice(0, 4)} S:${guest.assignment.seatNumber}`
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
                          setAssignmentStatus({
                            level: result.level ?? "success",
                            message: result.message,
                          });
                          setTimeout(() => setAssignmentStatus(null), 1600);
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
                    setAssignmentStatus({
                      level: result.level ?? "success",
                      message: result.message,
                    });
                    setTimeout(() => setAssignmentStatus(null), 1600);
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
}
