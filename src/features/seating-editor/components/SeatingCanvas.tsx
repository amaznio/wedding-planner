import type { PointerEvent, WheelEvent } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/provider";
import {
  buildGroupMovePlan,
  getAutoMoveTogetherRelationships,
  type PairSidePreference,
} from "../lib/group-move";
import { getCursorColorPreset } from "../lib/cursor-colors";
import { getTableSeatPositions } from "../lib/seat-positioning";
import { getTableDimensions } from "../lib/table-dimensions";
import type { SeatingRelationship } from "../types/relationship.types";
import type { SeatingPlan, SeatingTableType } from "../types/seating-plan.types";
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
    Record<
      number,
      {
        guestId: string;
        guestName: string;
        guestGroupColor: string | null;
        guestGroupName: string | null;
      }
    >
  >;
  selectedGuestId?: string | null;
  guests?: Array<{
    id: string;
    name: string;
    sex: "male" | "female" | "unknown";
    plusOneHostGuestId?: string | null;
    group: {
      id: string;
      name: string;
      color: string;
    } | null;
    assignment: { tableId: string; seatNumber: number } | null;
  }>;
  onTableDragStateChange?: (isDragging: boolean) => void;
  onAddTable?: (type?: SeatingTableType) => void;
  mobileMode?: boolean;
  showGroupColors?: boolean;
  onToggleGroupColors?: () => void;
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
  pairSidePreference?: PairSidePreference;
  relationshipsByGuestId?: Record<string, SeatingRelationship[]>;
  readOnly?: boolean;
  remoteCursors?: Array<{
    participantId: string;
    displayName: string;
    colorKey?: string;
    x: number;
    y: number;
    updatedAt: number;
    lastMovementAt: number;
  }>;
  onPointerPresenceChange?: (x: number, y: number) => void;
  highlightedSeats?: Record<string, number[]>;
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
  selectedGuestId,
  guests = [],
  selectedSeat,
  onSelectSeat,
  onTableDragStateChange,
  onAddTable,
  mobileMode = false,
  showGroupColors = false,
  onToggleGroupColors,
  enableTableDrag = true,
  onToggleTableDrag,
  onViewChange,
  draggedGuestId = null,
  isDraggingGuest = false,
  enableSeatDrag = false,
  onSeatGuestDragStart,
  onSeatGuestDragEnd,
  onGuestDropToSeat,
  pairSidePreference,
  relationshipsByGuestId = {},
  readOnly = false,
  remoteCursors = [],
  onPointerPresenceChange,
  highlightedSeats = {},
}, ref) {
  const { t } = useI18n();
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
  const viewRef = useRef(view);
  const [isPanning, setIsPanning] = useState(false);
  const [dragHoverSeat, setDragHoverSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const [linkedDragPreviewSeatsByTable, setLinkedDragPreviewSeatsByTable] = useState<
    Record<string, number[]>
  >({});
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
      const { width, height } = getTableDimensions(table);
      const seatPositions = getTableSeatPositions(table);
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
  const applyView = useCallback((next: { scale: number; x: number; y: number }) => {
    viewRef.current = next;
    setView(next);
    onViewChange?.(next);
  }, [onViewChange]);
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: clientX, y: clientY };
    }

    const rect = viewport.getBoundingClientRect();
    const currentView = viewRef.current;
    return {
      x: (clientX - rect.left - currentView.x) / currentView.scale,
      y: (clientY - rect.top - currentView.y) / currentView.scale,
    };
  }, []);
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
    applyView(nextView);
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
    if (target.closest("[data-table-root='true']") && enableTableDrag) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.setPointerCapture(event.pointerId);
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
    const canvasPoint = screenToCanvas(event.clientX, event.clientY);
    onPointerPresenceChange?.(canvasPoint.x, canvasPoint.y);

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
        applyView(nextView);
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
    applyView(nextView);
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
    onSelectTable?.(null);
  };

  const handleSeatClick = (
    tableId: string,
    seatNumber: number,
  ) => {
    onSelectSeat?.(tableId, seatNumber);
  };
  const effectiveDraggedGuestId = draggedGuestId ?? draggedSeatGuestId;
  const isAnyGuestDragActive = isDraggingGuest || draggedSeatGuestId !== null;
  useEffect(() => {
    if (!isAnyGuestDragActive) {
      setDragHoverSeat(null);
      setLinkedDragPreviewSeatsByTable({});
    }
  }, [isAnyGuestDragActive]);
  const totalSeats = plan.tables.reduce((sum, table) => sum + table.seatCount, 0);
  const filledSeats = Object.values(seatAssignments ?? {}).reduce(
    (sum, tableSeats) => sum + Object.keys(tableSeats).length,
    0,
  );
  const activeGroupSwatches = useMemo(() => {
    const byKey = new Map<string, { name: string; color: string }>();
    for (const guest of guests) {
      if (!guest.assignment || !guest.group) continue;
      const key = `${guest.group.name}:${guest.group.color}`;
      if (!byKey.has(key)) {
        byKey.set(key, { name: guest.group.name, color: guest.group.color });
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [guests]);

  useEffect(() => {
    if (centeredPlanIdRef.current === plan.id) return;
    const centeredView = getFitView();
    if (!centeredView) return;
    applyView(centeredView);
    centeredPlanIdRef.current = plan.id;
  }, [mobileMode, plan.id, plan.tables]);

  useEffect(() => {
    const handleOpenLegend = () => setMobileLegendOpen(true);
    window.addEventListener("mobile-open-legend", handleOpenLegend);
    return () => window.removeEventListener("mobile-open-legend", handleOpenLegend);
  }, []);

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
        {!readOnly && onAddTable ? (
        <div
          className="absolute right-3 top-3 z-20 hidden lg:block"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className={`h-11 px-4 text-sm font-medium shadow-sm ${
                  plan.tables.length === 0 ? "ring-2 ring-zinc-200 ring-offset-2 ring-offset-zinc-100/40" : ""
                }`}
              >
                {t("canvas.add")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAddTable("rectangle")}>{t("canvas.rectangularTable")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddTable("circle")}>{t("canvas.roundTable")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("canvas.buffetComing")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("canvas.danceComing")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        ) : null}
        {!mobileMode ? (
          <div className="absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 lg:block">
            <span className="inline-flex h-8 items-center rounded-full border border-zinc-200/90 bg-white/95 px-3 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
              {t("canvas.seatsSummary", { filled: filledSeats, total: totalSeats })}
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
              {t("canvas.reset")}
            </Button>
            <Button
              size="sm"
              variant={showGroupColors ? "default" : "outline"}
              className="h-8 rounded-lg px-3 text-xs font-medium"
              aria-pressed={showGroupColors}
              onClick={onToggleGroupColors}
            >
              {t("canvas.groupColorsMode")}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs font-medium">
                  {t("editor.legend")}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-3">
                <p className="mb-2 text-xs font-semibold text-zinc-800">{t("canvas.legendTitle")}</p>
                <div className="space-y-1 text-xs text-zinc-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                    <span>{t("editor.selectedGuest")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-100" />
                    <span>{t("canvas.selectedSeat")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-300 bg-blue-50" />
                    <span>{t("editor.occupied")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border"
                      style={{
                        backgroundColor: showGroupColors ? "#2563EB" : "white",
                        borderColor: showGroupColors ? "#1D4ED8" : "#D4D4D8",
                      }}
                    />
                    <span>
                      {t("canvas.groupColorsMode")} ({showGroupColors ? t("guestPanel.on") : t("guestPanel.off")})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white" />
                    <span>{t("editor.empty")}</span>
                  </div>
                  {activeGroupSwatches.length > 0 ? (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {t("canvas.activeGroups")}
                      </p>
                      <div className="space-y-1">
                        {activeGroupSwatches.map((group) => (
                          <div key={`${group.name}:${group.color}`} className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="truncate">{group.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
        {mobileMode && !readOnly ? (
          <div
            className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-full bg-white px-2.5 text-xs"
              onClick={resetView}
            >
              <svg viewBox="0 0 24 24" className="mr-1 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>{Math.round(view.scale * 100)}%</span>
            </Button>
            <Button
              type="button"
              variant={enableTableDrag ? "default" : "outline"}
              className={`h-8 rounded-full px-2 text-xs ${
                enableTableDrag
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-white text-zinc-700"
              }`}
              onClick={onToggleTableDrag}
              aria-pressed={enableTableDrag}
              aria-label={t("canvas.moveTables", {
                value: enableTableDrag ? t("guestPanel.on") : t("guestPanel.off"),
              })}
              title={t("canvas.moveTables", {
                value: enableTableDrag ? t("guestPanel.on") : t("guestPanel.off"),
              })}
            >
              {enableTableDrag ? (
                <svg viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                  <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
                  <path d="m8.5 17.5 3.5 3.5 3.5-3.5" />
                  <path d="m6.5 8.5-3.5 3.5 3.5 3.5" />
                  <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                  <path d="M4 4 20 20" />
                </svg>
              )}
              <span className="text-[11px] font-semibold">
                {enableTableDrag ? t("guestPanel.on") : t("guestPanel.off")}
              </span>
            </Button>
          </div>
        ) : null}
        <Drawer open={mobileLegendOpen} onOpenChange={setMobileLegendOpen}>
          <DrawerContent className="p-4">
            <DrawerTitle className="sr-only">{t("canvas.legendTitle")}</DrawerTitle>
            <p className="mb-2 text-sm font-semibold text-zinc-800">{t("canvas.legendTitle")}</p>
            <div className="space-y-2 text-sm text-zinc-600">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border"
                  style={{
                    backgroundColor: showGroupColors ? "#2563EB" : "white",
                    borderColor: showGroupColors ? "#1D4ED8" : "#D4D4D8",
                  }}
                />
                <span>
                  {t("canvas.groupColorsMode")} ({showGroupColors ? t("guestPanel.on") : t("guestPanel.off")})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-100" />
                <span>{t("editor.selectedGuest")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-100" />
                <span>{t("canvas.selectedSeat")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-300 bg-blue-50" />
                <span>{t("editor.occupied")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300 bg-white" />
                <span>{t("editor.empty")}</span>
              </div>
              {activeGroupSwatches.length > 0 ? (
                <div className="pt-1">
                  <p className="mb-1 text-xs font-semibold text-zinc-800">
                    {t("canvas.activeGroups")}
                  </p>
                  <div className="space-y-1">
                    {activeGroupSwatches.map((group) => (
                      <div key={`${group.name}:${group.color}`} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-300"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-xs">{group.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
              showGroupColors={showGroupColors}
              dropTargetSeatNumber={
                dragHoverSeat?.tableId === table.id
                  ? dragHoverSeat.seatNumber
                  : null
              }
              linkedDropPreviewSeatNumbers={linkedDragPreviewSeatsByTable[table.id] ?? []}
              highlightedSeatNumbers={highlightedSeats[table.id] ?? []}
              isDragActive={isAnyGuestDragActive}
              enableTableDrag={enableTableDrag}
              enableSeatDrag={enableSeatDrag}
              showHoverSeatNames={!mobileMode}
              selectedSeatNumber={
                selectedSeat?.tableId === table.id ? selectedSeat.seatNumber : null
              }
              onSeatClick={handleSeatClick}
              onDragStateChange={(isDragging) => {
                onTableDragStateChange?.(isDragging);
              }}
              onSeatDragEnter={(tableId, seatNumber) => {
                if (!isAnyGuestDragActive) return;
                setDragHoverSeat({ tableId, seatNumber });
                const hoverGuestId = effectiveDraggedGuestId;
                if (!hoverGuestId) {
                  setLinkedDragPreviewSeatsByTable({});
                  return;
                }
                const moveTogetherRelationships = getAutoMoveTogetherRelationships(
                  hoverGuestId,
                  relationshipsByGuestId,
                );
                if (moveTogetherRelationships.length === 0) {
                  setLinkedDragPreviewSeatsByTable({});
                  return;
                }
                const planResult = buildGroupMovePlan({
                  initiatorGuestId: hoverGuestId,
                  targetTableId: tableId,
                  targetSeatNumber: seatNumber,
                  pairSidePreference,
                  tables: plan.tables.map((table) => ({
                    id: table.id,
                    type: table.type,
                    x: table.x,
                    y: table.y,
                    seatCount: table.seatCount,
                  })),
                  guests,
                  relationships: moveTogetherRelationships,
                });
                if (!planResult.ok) {
                  setLinkedDragPreviewSeatsByTable({});
                  return;
                }
                const nextPreviewByTable: Record<string, number[]> = {};
                for (const assignment of planResult.assignments) {
                  if (assignment.guestId === hoverGuestId) continue;
                  const seats = nextPreviewByTable[assignment.tableId] ?? [];
                  seats.push(assignment.seatNumber);
                  nextPreviewByTable[assignment.tableId] = seats;
                }
                setLinkedDragPreviewSeatsByTable(nextPreviewByTable);
              }}
              onSeatDragLeave={(tableId, seatNumber) => {
                if (
                  dragHoverSeat?.tableId === tableId &&
                  dragHoverSeat?.seatNumber === seatNumber
                ) {
                  setDragHoverSeat(null);
                  setLinkedDragPreviewSeatsByTable({});
                }
              }}
              onSeatDrop={async (tableId, seatNumber, guestId) => {
                setDragHoverSeat(null);
                setLinkedDragPreviewSeatsByTable({});
                if (!isAnyGuestDragActive) return;
                const effectiveGuestId = guestId || effectiveDraggedGuestId;
                if (!effectiveGuestId) return;
                await onGuestDropToSeat?.(tableId, seatNumber, effectiveGuestId);
              }}
              onSeatGuestDragStart={(guestId) => {
                setDraggedSeatGuestId(guestId);
                onSeatGuestDragStart?.(guestId);
              }}
              onSeatGuestDragEnd={() => {
                setDraggedSeatGuestId(null);
                setDragHoverSeat(null);
                setLinkedDragPreviewSeatsByTable({});
                onSeatGuestDragEnd?.();
              }}
              screenToCanvas={screenToCanvas}
            />
          ))}
        </div>
        {remoteCursors.map((cursor) => {
          const now = Date.now();
          const screenX = view.x + cursor.x * view.scale;
          const screenY = view.y + cursor.y * view.scale;
          const showLabel = now - cursor.lastMovementAt >= 1000;
          const colorPreset = getCursorColorPreset(cursor.colorKey);
          return (
            <div
              key={cursor.participantId}
              className="pointer-events-none absolute z-30"
              style={{ left: screenX, top: screenY }}
            >
              <MousePointer2 className={`-translate-x-1/2 -translate-y-1/2 drop-shadow-sm ${colorPreset.markerClass}`} size={18} />
              <div
                className={`absolute left-3 top-0 -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold shadow-sm ring-1 transition-opacity ${colorPreset.labelClass} ${
                  showLabel ? "opacity-100" : "opacity-0"
                }`}
              >
                {cursor.displayName}
              </div>
            </div>
          );
        })}
        {plan.tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-md border border-dashed border-zinc-300 bg-white/80 px-4 py-3 text-sm text-zinc-600">
              {t("canvas.noTables")}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});
