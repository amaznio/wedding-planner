import {
  getCircleTableDimensions,
  getRectangleTableDimensions,
  getTableDimensions,
} from "./table-dimensions";
import type { RectangleSeatLayout, SeatingTable } from "../types/seating-plan.types";

export type SeatPosition = {
  seatNumber: number;
  x: number;
  y: number;
};

const SEAT_OFFSET = 22;

export function getSeatPositions(
  seatCount: number,
  tableWidth: number,
  tableHeight: number,
  seatLayout: RectangleSeatLayout = "balanced",
): SeatPosition[] {
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

  const positions: SeatPosition[] = [];

  for (let index = 0; index < topSeatCount; index += 1) {
    const ratio = (index + 1) / (topSeatCount + 1);
    positions.push({
      seatNumber: index + 1,
      x: ratio * tableWidth,
      y: -SEAT_OFFSET,
    });
  }

  for (let index = 0; index < bottomSeatCount; index += 1) {
    const ratio = (index + 1) / (bottomSeatCount + 1);
    positions.push({
      seatNumber: topSeatCount + index + 1,
      x: ratio * tableWidth,
      y: tableHeight + SEAT_OFFSET,
    });
  }

  return positions;
}

export function getCircleSeatPositions(seatCount: number): SeatPosition[] {
  const safeSeatCount = Math.max(1, Math.floor(seatCount));
  const dimensions = getCircleTableDimensions(safeSeatCount);
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;

  return Array.from({ length: safeSeatCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / safeSeatCount;
    return {
      seatNumber: index + 1,
      x: centerX + Math.cos(angle) * dimensions.seatRingRadius,
      y: centerY + Math.sin(angle) * dimensions.seatRingRadius,
    };
  });
}

export function getTableSeatPositions(
  table: Pick<SeatingTable, "type" | "seatCount" | "seatLayout">,
): SeatPosition[] {
  if (table.type === "circle") {
    return getCircleSeatPositions(table.seatCount);
  }

  const dimensions = getRectangleTableDimensions(table.seatCount, table.seatLayout);
  return getSeatPositions(
    table.seatCount,
    dimensions.width,
    dimensions.height,
    table.seatLayout,
  );
}

export function getTableVisualBounds(
  table: Pick<SeatingTable, "type" | "seatCount" | "seatLayout">,
  seatRadius = 18,
) {
  const dimensions = getTableDimensions(table);
  const seats = getTableSeatPositions(table);
  let minX = 0;
  let minY = 0;
  let maxX = dimensions.width;
  let maxY = dimensions.height;

  for (const seat of seats) {
    minX = Math.min(minX, seat.x - seatRadius);
    minY = Math.min(minY, seat.y - seatRadius);
    maxX = Math.max(maxX, seat.x + seatRadius);
    maxY = Math.max(maxY, seat.y + seatRadius);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
