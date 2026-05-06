import type { PointerEvent, WheelEvent } from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
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
};

export function SeatingCanvas({
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
    setSeatMenu(null);
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
    onSelectSeat?.(tableId, seatNumber);
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
          <div
            className="absolute bottom-3 right-3 z-20 flex select-none items-center gap-1 rounded-md border border-zinc-200 bg-white/95 px-1.5 py-1.5 text-[11px] shadow-sm"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className="px-1 text-zinc-600">{Math.round(view.scale * 100)}%</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() =>
                setView((current) => ({
                  ...current,
                  scale: Math.min(2.5, current.scale * 1.1),
                }))
              }
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() =>
                setView((current) => ({
                  ...current,
                  scale: Math.max(0.25, current.scale * 0.9),
                }))
              }
            >
              -
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => setView({ scale: 1, x: 0, y: 0 })}
            >
              Reset
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
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
}
