"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RectTable } from "@/features/seating-editor/components/RectTable";
import { getTableVisualBounds } from "@/features/seating-editor/lib/seat-positioning";
import type { SeatingTable } from "@/features/seating-editor/types/seating-plan.types";
import { useI18n } from "@/i18n/provider";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 420;
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type DemoTable = Omit<SeatingTable, "label">;

const initialTables: DemoTable[] = [
  {
    id: "homepage-preview-table-1",
    type: "rectangle",
    x: 80,
    y: 110,
    rotation: 0,
    seatCount: 6,
    seatLayout: "balanced",
  },
  {
    id: "homepage-preview-table-2",
    type: "rectangle",
    x: 720,
    y: 125,
    rotation: 0,
    seatCount: 5,
    seatLayout: "balanced",
  },
  {
    id: "homepage-preview-table-3",
    type: "rectangle",
    x: 410,
    y: 290,
    rotation: 0,
    seatCount: 7,
    seatLayout: "balanced",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampTablePosition(table: DemoTable, nextX: number, nextY: number) {
  const bounds = getTableVisualBounds(table);
  const minX = -bounds.minX;
  const minY = -bounds.minY;
  const maxX = Math.max(minX, CANVAS_WIDTH - bounds.maxX);
  const maxY = Math.max(minY, CANVAS_HEIGHT - bounds.maxY);

  return {
    x: clamp(nextX, minX, maxX),
    y: clamp(nextY, minY, maxY),
  };
}

export function HomeSeatingCanvas() {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [tables, setTables] = useState<DemoTable[]>(initialTables);
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewportSize();
    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, []);

  const viewportTransform = useMemo(() => {
    if (!viewportSize) return null;

    const width = viewportSize.width;
    const height = viewportSize.height;
    const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);

    return {
      scale,
      x: (width - CANVAS_WIDTH * scale) / 2,
      y: (height - CANVAS_HEIGHT * scale) / 2,
    };
  }, [viewportSize]);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport || !viewportTransform) {
        return { x: clientX, y: clientY };
      }

      const rect = viewport.getBoundingClientRect();

      return {
        x: (clientX - rect.left - viewportTransform.x) / viewportTransform.scale,
        y: (clientY - rect.top - viewportTransform.y) / viewportTransform.scale,
      };
    },
    [viewportTransform],
  );

  const handleMoveTable = useCallback(
    (tableId: string, nextX: number, nextY: number) => {
      setTables((currentTables) =>
        currentTables.map((table) => {
          if (table.id !== tableId) return table;
          const nextPosition = clampTablePosition(table, nextX, nextY);

          return {
            ...table,
            ...nextPosition,
          };
        }),
      );
    },
    [],
  );

  const displayTables: SeatingTable[] = tables.map((table, index) => ({
    ...table,
    label: t("home.previewTable", { number: index + 1 }),
  }));

  return (
    <div
      ref={viewportRef}
      aria-label={t("home.previewAriaLabel")}
      className="relative h-[400px] min-h-[360px] overflow-hidden sm:h-[440px] lg:h-[52vh] lg:min-h-[500px] lg:max-h-[560px]"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, black 7%, black 93%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, black 7%, black 93%, transparent 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(221 214 254 / 0.58) 1px, transparent 1px), linear-gradient(to bottom, rgb(221 214 254 / 0.58) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 7%, black 91%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 7%, black 91%, transparent 100%)",
        }}
      >
        {viewportTransform ? (
          <div
            className="absolute left-0 top-0"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.scale})`,
              transformOrigin: "top left",
            }}
          >
            {displayTables.map((table) => (
              <RectTable
                key={table.id}
                presentation="preview"
                table={table}
                showOccupancy={false}
                enableTableDrag
                enableSeatDrag={false}
                showHoverSeatNames={false}
                onMove={handleMoveTable}
                screenToCanvas={screenToCanvas}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
