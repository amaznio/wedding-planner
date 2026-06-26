import type {
  RectangleSeatLayout,
  SeatingTable,
  SeatingTableType,
} from "../types/seating-plan.types";

const TABLE_HEIGHT = 80;
const MIN_TABLE_WIDTH = 140;
const SEAT_SPACING = 40;
const CIRCLE_TABLE_DIAMETER = 112;
const SEAT_DIAMETER = 36;
const MIN_CIRCLE_SEAT_SPACING = 42;
const CIRCLE_SEAT_GAP = 18;

export type RectangleTableDimensions = {
  width: number;
  height: number;
  topSeatCount: number;
  bottomSeatCount: number;
};

export type CircleTableDimensions = {
  width: number;
  height: number;
  diameter: number;
  seatRingRadius: number;
};

export type TableDimensions =
  | (RectangleTableDimensions & { type: "rectangle" })
  | (CircleTableDimensions & { type: "circle" });

export function getRectangleTableDimensions(
  seatCount: number,
  seatLayout: RectangleSeatLayout = "balanced",
): RectangleTableDimensions {
  const safeSeatCount = Math.max(1, Math.floor(seatCount));
  const topSeatCount =
    seatLayout === "top-only"
      ? safeSeatCount
      : seatLayout === "bottom-only"
        ? 0
        : Math.ceil(safeSeatCount / 2);
  const bottomSeatCount =
    seatLayout === "bottom-only"
      ? safeSeatCount
      : seatLayout === "top-only"
        ? 0
        : Math.floor(safeSeatCount / 2);
  const seatsOnWidestSide = Math.max(topSeatCount, bottomSeatCount);

  const width = Math.max(
    MIN_TABLE_WIDTH,
    seatsOnWidestSide * SEAT_SPACING + 48,
  );

  return {
    width,
    height: TABLE_HEIGHT,
    topSeatCount,
    bottomSeatCount,
  };
}

export function getCircleTableDimensions(seatCount: number): CircleTableDimensions {
  const safeSeatCount = Math.max(1, Math.floor(seatCount));
  const minimumRingRadius = CIRCLE_TABLE_DIAMETER / 2 + CIRCLE_SEAT_GAP + SEAT_DIAMETER / 2;
  const spacingRingRadius =
    (safeSeatCount * MIN_CIRCLE_SEAT_SPACING) / (2 * Math.PI);

  return {
    width: CIRCLE_TABLE_DIAMETER,
    height: CIRCLE_TABLE_DIAMETER,
    diameter: CIRCLE_TABLE_DIAMETER,
    seatRingRadius: Math.max(minimumRingRadius, spacingRingRadius),
  };
}

export function getTableDimensions(table: Pick<SeatingTable, "type" | "seatCount" | "seatLayout">): TableDimensions {
  if (table.type === "circle") {
    return {
      type: "circle",
      ...getCircleTableDimensions(table.seatCount),
    };
  }

  return {
    type: "rectangle",
    ...getRectangleTableDimensions(table.seatCount, table.seatLayout),
  };
}

export function isKnownTableType(type: string): type is SeatingTableType {
  return type === "rectangle" || type === "circle";
}
