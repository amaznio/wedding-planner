import type { RectangleSeatLayout } from "../types/seating-plan.types";

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
