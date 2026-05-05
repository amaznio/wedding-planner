const TABLE_HEIGHT = 80;
const MIN_TABLE_WIDTH = 140;
const SEAT_SPACING = 28;

export type RectangleTableDimensions = {
  width: number;
  height: number;
  topSeatCount: number;
  bottomSeatCount: number;
};

export function getRectangleTableDimensions(
  seatCount: number,
): RectangleTableDimensions {
  const safeSeatCount = Math.max(1, Math.floor(seatCount));
  const topSeatCount = Math.ceil(safeSeatCount / 2);
  const bottomSeatCount = Math.floor(safeSeatCount / 2);
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
