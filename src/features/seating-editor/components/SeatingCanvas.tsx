import type { PointerEvent, WheelEvent } from "react";
import { useRef, useState } from "react";

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
    const nextScale = Math.max(0.5, Math.min(2.5, view.scale * zoomFactor));

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
    onSelectTable?.(null);
  };

  return (
    <section className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4">
      <div
        ref={viewportRef}
        className="relative h-full w-full select-none rounded-md border border-zinc-200"
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
          className="absolute left-3 top-3 z-20 flex select-none items-center gap-2 rounded-md border border-zinc-200 bg-white/95 px-3 py-2 text-xs shadow-sm"
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
              screenToCanvas={screenToCanvas}
            />
          ))}
        </div>
        {plan.tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-md border border-dashed border-zinc-300 bg-white/80 px-4 py-3 text-sm text-zinc-600">
              No tables yet. Use <span className="font-medium">Add Table</span> to start.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
