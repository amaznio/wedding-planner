import type { PointerEvent, WheelEvent } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/i18n/provider";
import {
  buildGroupMovePlan,
  getAutoMoveTogetherRelationships,
  type PairSidePreference,
} from "../lib/group-move";
import { getCursorColorPreset } from "../lib/cursor-colors";
import { resolveEffectiveGuestGroup } from "../lib/guest-group";
import { getSeatPositions } from "../lib/seat-positioning";
import { getRectangleTableDimensions } from "../lib/table-dimensions";
import type { SeatingRelationship } from "../types/relationship.types";
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
  tableLabelById?: Record<string, string>;
  selectedGuestId?: string | null;
  guests?: Array<{
    id: string;
    name: string;
    sex: "male" | "female" | "unknown";
    plannedTableId: string | null;
    plusOneHostGuestId?: string | null;
    group: {
      id: string;
      name: string;
      color: string;
    } | null;
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
  onGuestDropToTable?: (tableId: string, guestId: string) => Promise<void> | void;
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
  tableLabelById = {},
  selectedGuestId,
  guests = [],
  onSeatAssign,
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
  onGuestDropToTable,
  pairSidePreference,
  relationshipsByGuestId = {},
  readOnly = false,
  remoteCursors = [],
  onPointerPresenceChange,
  highlightedSeats = {},
}, ref) {
  const { t } = useI18n();
  const relationshipTypeLabel: Record<SeatingRelationship["type"], string> = {
    couple: t("guestPanel.relationshipType.couple"),
    family: t("guestPanel.relationshipType.family"),
    group: t("guestPanel.relationshipType.group"),
    custom: t("guestPanel.relationshipType.custom"),
    plus_one: t("guestPanel.relationshipType.plus_one"),
  };
  const preferredSeatingLabel: Record<SeatingRelationship["preferredSeating"], string> = {
    none: t("guestPanel.preferredSeating.none"),
    adjacent: t("guestPanel.preferredSeating.adjacent"),
    nearby: t("guestPanel.preferredSeating.nearby"),
    "same-table": t("guestPanel.preferredSeating.same-table"),
  };
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
  const [seatMenu, setSeatMenu] = useState<{
    tableId: string;
    seatNumber: number;
    x: number;
    y: number;
  } | null>(null);
  const [isAssigningSeat, setIsAssigningSeat] = useState(false);
  const [seatMenuError, setSeatMenuError] = useState<string | null>(null);
  const [seatMenuGuestFilter, setSeatMenuGuestFilter] = useState<"all" | "unseated" | "assigned">(
    "unseated",
  );
  const [seatMenuShowAllGuests, setSeatMenuShowAllGuests] = useState(false);
  const [seatMenuQuery, setSeatMenuQuery] = useState("");
  const [isSeatUnassignConfirmOpen, setIsSeatUnassignConfirmOpen] = useState(false);
  const [conflictSeat, setConflictSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const [dragHoverSeat, setDragHoverSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const [dragHoverTableId, setDragHoverTableId] = useState<string | null>(null);
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
    setSeatMenuGuestFilter(guests.some((guest) => guest.assignment === null) ? "unseated" : "all");
    setSeatMenuShowAllGuests(false);
    setSeatMenuQuery("");
    setSeatMenu({ tableId, seatNumber, x, y });
    onSelectSeat?.(tableId, seatNumber);
  };

  const menuSeatAssignment = seatMenu
    ? (seatAssignments?.[seatMenu.tableId]?.[seatMenu.seatNumber] ?? null)
    : null;
  const guestsById = useMemo(() => {
    return Object.fromEntries(guests.map((guest) => [guest.id, guest]));
  }, [guests]);
  const seatMenuGuests = useMemo(() => {
    if (!seatMenu) return [];
    const query = seatMenuQuery.trim().toLowerCase();
    const filtered = guests.filter((guest) => {
      const isCurrentSeatOccupant = menuSeatAssignment?.guestId === guest.id;
      const matchesPlannedTable =
        guest.plannedTableId === seatMenu.tableId || isCurrentSeatOccupant;
      const inPool = seatMenuShowAllGuests ? true : matchesPlannedTable;
      if (!inPool) return false;

      const matchesFilter =
        seatMenuGuestFilter === "assigned"
          ? guest.assignment !== null
          : seatMenuGuestFilter === "unseated"
            ? guest.assignment === null
            : true;
      const matchesQuery =
        query.length === 0 || guest.name.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });

    const byName = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: "base" });

    if (seatMenuGuestFilter === "all") {
      return filtered.sort((a, b) => {
        const assignmentRankA = a.assignment ? 1 : 0;
        const assignmentRankB = b.assignment ? 1 : 0;
        if (assignmentRankA !== assignmentRankB) {
          return assignmentRankA - assignmentRankB;
        }
        return byName(a.name, b.name);
      });
    }

    return filtered.sort((a, b) => byName(a.name, b.name));
  }, [guests, menuSeatAssignment?.guestId, seatMenu, seatMenuGuestFilter, seatMenuQuery, seatMenuShowAllGuests]);
  const closeSeatMenu = () => {
    setSeatMenu(null);
    setIsSeatUnassignConfirmOpen(false);
    setSeatMenuShowAllGuests(false);
  };
  const handleSeatMenuAssign = async (guestId: string | null) => {
    if (!seatMenu) return;
    setIsAssigningSeat(true);
    try {
      setSeatMenuError(null);
      setConflictSeat(null);
      const result = await onSeatAssign?.(
        seatMenu.tableId,
        seatMenu.seatNumber,
        guestId,
      );
      if (result?.message) {
        toast({
          variant: result.level === "info" ? "info" : "success",
          title: result.level === "info" ? t("toasts.info") : t("toasts.success"),
          description: result.message,
        });
      }
      closeSeatMenu();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : guestId === null
          ? t("canvas.failedUnassign")
          : t("canvas.failedAssign");
      setSeatMenuError(message);
      setConflictSeat({
        tableId: seatMenu.tableId,
        seatNumber: seatMenu.seatNumber,
      });
    } finally {
      setIsAssigningSeat(false);
    }
  };
  const seatMenuContent = seatMenu ? (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-lg font-medium leading-tight text-zinc-900 lg:text-base">
          {t("canvas.current", {
            name: menuSeatAssignment?.guestName ?? t("inspector.unassigned"),
          })}
        </p>
        <button
          type="button"
          onClick={closeSeatMenu}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
          aria-label={t("common.close")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      </div>
      {seatMenuError ? (
        <div className="mb-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
          {seatMenuError}
        </div>
      ) : null}
      {readOnly ? (
        <div className="mb-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600">
          {menuSeatAssignment ? t("editor.occupied") : t("editor.empty")}
        </div>
      ) : (
        <>
      <div className="mb-2 flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={seatMenuGuestFilter === "unseated" ? "default" : "outline"}
          className="h-6 rounded-full px-2 text-[10px]"
          onClick={() => setSeatMenuGuestFilter("unseated")}
        >
          {t("guestPanel.filterUnseated")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={seatMenuGuestFilter === "assigned" ? "default" : "outline"}
          className="h-6 rounded-full px-2 text-[10px]"
          onClick={() => setSeatMenuGuestFilter("assigned")}
        >
          {t("guestPanel.filterAssigned")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={seatMenuGuestFilter === "all" ? "default" : "outline"}
          className="h-6 rounded-full px-2 text-[10px]"
          onClick={() => setSeatMenuGuestFilter("all")}
        >
          {t("guestPanel.filterAll")}
        </Button>
      </div>
      <Input
        value={seatMenuQuery}
        onChange={(event) => setSeatMenuQuery(event.target.value)}
        placeholder={t("guestPanel.searchPlaceholder")}
        className="mb-2 h-8 text-xs"
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {seatMenuShowAllGuests
            ? t("canvas.showingAllGuests")
            : t("canvas.showingPlannedGuests")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          onClick={() => setSeatMenuShowAllGuests((current) => !current)}
        >
          {seatMenuShowAllGuests ? t("canvas.showPlannedOnly") : t("canvas.showAllGuests")}
        </Button>
      </div>
      <div
        className="mb-2 max-h-64 overflow-auto overscroll-contain rounded-lg border border-zinc-200 bg-white/60"
        onWheelCapture={(event) => event.stopPropagation()}
      >
        {seatMenuGuests.map((guest) => {
          const isCurrent = menuSeatAssignment?.guestId === guest.id;
          const assignmentLabel = guest.assignment
            ? `${tableLabelById[guest.assignment.tableId] ?? t("guestPanel.tableFallback")} • ${t("guestPanel.seat", { seat: guest.assignment.seatNumber })}`
            : t("guestPanel.unseated");
          const effectiveGroup = resolveEffectiveGuestGroup(guest, guestsById);
          const guestRelationships = relationshipsByGuestId[guest.id] ?? [];
          const moveTogetherGuestIds = new Set(
            guestRelationships
              .filter((relationship) => relationship.moveTogetherDefault)
              .flatMap((relationship) => relationship.guestIds),
          );
          const moveTogetherPreviewCount = moveTogetherGuestIds.size;
          return (
            <button
              key={guest.id}
              type="button"
              disabled={isAssigningSeat}
              onClick={() => void handleSeatMenuAssign(guest.id)}
              className={`relative w-full overflow-hidden border-b border-zinc-200/70 px-3 py-1.5 text-left transition-colors last:border-b-0 hover:bg-zinc-100/60 ${
                isCurrent ? "border-l-2 border-l-amber-500 bg-zinc-50" : ""
              }`}
            >
              {effectiveGroup?.color && !isCurrent ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: effectiveGroup.color }}
                />
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={`truncate text-base leading-tight text-zinc-900 lg:text-[15px] ${
                      isCurrent ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {guest.name}
                  </span>
                  {guestRelationships.length > 0 ? (
                    <span className="truncate text-[11px] leading-tight text-zinc-500 lg:text-[10px]">
                      {guestRelationships
                        .map((relationship) =>
                          relationship.name?.trim().length
                            ? relationship.name
                            : relationshipTypeLabel[relationship.type],
                        )
                        .join(", ")}
                      {" • "}
                      {guestRelationships
                        .map((relationship) => preferredSeatingLabel[relationship.preferredSeating])
                        .join(", ")}
                      {moveTogetherPreviewCount > 0 ? (
                        <>
                          {" • "}
                          {t("canvas.groupMove", { count: moveTogetherPreviewCount })}
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Badge
                    variant={guest.assignment ? "success" : "default"}
                    className="px-1.5 py-0 text-[8px] leading-4"
                  >
                    {guest.assignment ? t("guestPanel.assigned") : t("guestPanel.unseated")}
                  </Badge>
                  <span className="text-right text-xs text-zinc-500 lg:text-[11px]">{assignmentLabel}</span>
                </span>
              </div>
            </button>
          );
        })}
        {seatMenuGuests.length === 0 ? (
          <div className="space-y-1 px-3 py-2 text-xs text-zinc-500">
            <p>{t("canvas.noPlannedGuestsForTable")}</p>
            {!seatMenuShowAllGuests ? (
              <button
                type="button"
                className="font-medium text-zinc-700 underline"
                onClick={() => setSeatMenuShowAllGuests(true)}
              >
                {t("canvas.showAllGuests")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={!menuSeatAssignment || isAssigningSeat}
        onClick={() => setIsSeatUnassignConfirmOpen(true)}
        className="w-full rounded-md border border-red-300 px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {t("canvas.unassignSeat")}
      </button>
        </>
      )}
    </>
  ) : null;
  const effectiveDraggedGuestId = draggedGuestId ?? draggedSeatGuestId;
  const isAnyGuestDragActive = isDraggingGuest || draggedSeatGuestId !== null;
  useEffect(() => {
    if (!isAnyGuestDragActive) {
      setDragHoverSeat(null);
      setDragHoverTableId(null);
      setLinkedDragPreviewSeatsByTable({});
    }
  }, [isAnyGuestDragActive]);
  const plannedCountByTable = useMemo(() => {
    const next: Record<string, number> = {};
    for (const guest of guests) {
      if (!guest.plannedTableId) continue;
      next[guest.plannedTableId] = (next[guest.plannedTableId] ?? 0) + 1;
    }
    return next;
  }, [guests]);
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
              <DropdownMenuItem onClick={onAddTable}>{t("canvas.rectangularTable")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("canvas.roundComing")}</DropdownMenuItem>
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
              plannedGuestCount={plannedCountByTable[table.id] ?? 0}
              isPlannedOverCapacity={(plannedCountByTable[table.id] ?? 0) > table.seatCount}
              isTableDropTarget={dragHoverTableId === table.id}
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
                if (isDragging) {
                  setSeatMenu(null);
                }
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
                setDragHoverTableId(null);
                setLinkedDragPreviewSeatsByTable({});
                if (!isAnyGuestDragActive) return;
                const effectiveGuestId = guestId || effectiveDraggedGuestId;
                if (!effectiveGuestId) return;
                await onGuestDropToSeat?.(tableId, seatNumber, effectiveGuestId);
              }}
              onTableDragEnter={(tableId) => {
                if (!isAnyGuestDragActive) return;
                setDragHoverTableId(tableId);
              }}
              onTableDragLeave={(tableId) => {
                if (dragHoverTableId === tableId) {
                  setDragHoverTableId(null);
                }
              }}
              onTableDrop={async (tableId, guestId) => {
                setDragHoverTableId(null);
                setDragHoverSeat(null);
                setLinkedDragPreviewSeatsByTable({});
                if (!isAnyGuestDragActive) return;
                const effectiveGuestId = guestId || effectiveDraggedGuestId;
                if (!effectiveGuestId) return;
                await onGuestDropToTable?.(tableId, effectiveGuestId);
              }}
              onSeatGuestDragStart={(guestId) => {
                setSeatMenu(null);
                setDraggedSeatGuestId(guestId);
                onSeatGuestDragStart?.(guestId);
              }}
              onSeatGuestDragEnd={() => {
                setDraggedSeatGuestId(null);
                setDragHoverSeat(null);
                setDragHoverTableId(null);
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
        {seatMenu && !mobileMode ? (
          <div
            className="absolute z-40 w-[min(92vw,380px)] rounded-2xl border border-zinc-300 bg-white/95 p-3 shadow-xl backdrop-blur"
            style={{ left: seatMenu.x, top: seatMenu.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onWheelCapture={(event) => event.stopPropagation()}
          >
            {seatMenuContent}
          </div>
        ) : null}
        {seatMenu && mobileMode ? (
          <Drawer open onOpenChange={(open) => (!open ? closeSeatMenu() : undefined)}>
            <DrawerContent className="h-auto max-h-[72dvh] p-3">
              <DrawerTitle className="sr-only">
                {t("guestPanel.seat", { seat: seatMenu.seatNumber })}
              </DrawerTitle>
              {seatMenuContent}
            </DrawerContent>
          </Drawer>
        ) : null}
        <ConfirmDialog
          open={isSeatUnassignConfirmOpen}
          onOpenChange={setIsSeatUnassignConfirmOpen}
          title={t("canvas.confirmUnassignSeatTitle")}
          description={t("canvas.confirmUnassignSeatDescription", {
            name: menuSeatAssignment?.guestName ?? t("inspector.unassigned"),
            seat: seatMenu?.seatNumber ?? 0,
          })}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          confirmVariant="default"
          onConfirm={async () => {
            await handleSeatMenuAssign(null);
          }}
        />
      </div>
    </section>
  );
});
