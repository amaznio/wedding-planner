import type { RectangleSeatLayout } from "../types/seating-plan.types";

const TABLE_HEIGHT = 80;
const MIN_TABLE_WIDTH = 140;
const SEAT_SPACING = 40;

export type RectangleTableDimensions = {
  width: number;
  height: number;
  topSeatCount: number;
  bottomSeatCount: number;
};

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
