import type { PrintLegendItem, PrintTable } from "@/features/seating-export/types/print-model";

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LegendColumn = {
  index: number;
  x: number;
  width: number;
  items: PrintLegendItem[];
};

const PAGE_MARGIN = 28;
const HEADER_HEIGHT = 30;
const HEADER_GAP = 4;
const COLUMN_GAP = 18;
const LEFT_RATIO = 0.58;
const LEGEND_TITLE_HEIGHT = 22;
const LEGEND_COLUMN_GAP = 14;
const LEGEND_ROW_HEIGHT = 24;

export function getLegendRowsPerColumn(contentHeight: number) {
  return Math.max(8, Math.floor((contentHeight - LEGEND_TITLE_HEIGHT - 8) / LEGEND_ROW_HEIGHT));
}

export function getLegendColumnCount(itemCount: number, rowsPerColumn: number) {
  const columns = Math.ceil(itemCount / rowsPerColumn);
  return Math.max(1, Math.min(3, columns));
}

export function splitLegendIntoColumns(
  items: PrintLegendItem[],
  columnCount: number,
) {
  const columns: PrintLegendItem[][] = Array.from({ length: columnCount }, () => []);
  const itemsPerColumn = Math.ceil(items.length / columnCount);

  for (let index = 0; index < columnCount; index += 1) {
    const start = index * itemsPerColumn;
    const end = start + itemsPerColumn;
    columns[index] = items.slice(start, end);
  }
  return columns;
}

export function getDetailPageLayout(pageWidth: number, pageHeight: number) {
  const content: Box = {
    x: PAGE_MARGIN,
    y: PAGE_MARGIN + HEADER_HEIGHT + HEADER_GAP,
    width: pageWidth - PAGE_MARGIN * 2,
    height: pageHeight - (PAGE_MARGIN * 2 + HEADER_HEIGHT + HEADER_GAP),
  };

  const leftWidth = Math.floor(content.width * LEFT_RATIO);
  const left: Box = {
    x: content.x,
    y: content.y,
    width: leftWidth,
    height: content.height,
  };

  const right: Box = {
    x: left.x + left.width + COLUMN_GAP,
    y: content.y,
    width: content.width - left.width - COLUMN_GAP,
    height: content.height,
  };

  return {
    margin: PAGE_MARGIN,
    headerHeight: HEADER_HEIGHT,
    content,
    left,
    right,
    columnGap: COLUMN_GAP,
    legendTitleHeight: LEGEND_TITLE_HEIGHT,
    legendColumnGap: LEGEND_COLUMN_GAP,
    legendRowHeight: LEGEND_ROW_HEIGHT,
  };
}

export function getDiagramPlacement(table: PrintTable, container: Box) {
  const seatRadius = 15;
  const seatPadding = seatRadius + 12;

  let minX = 0;
  let maxX = table.width;
  let minY = 0;
  let maxY = table.height;

  for (const seat of table.seats) {
    minX = Math.min(minX, seat.x - seatRadius);
    maxX = Math.max(maxX, seat.x + seatRadius);
    minY = Math.min(minY, seat.y - seatRadius);
    maxY = Math.max(maxY, seat.y + seatRadius);
  }

  minX -= seatPadding;
  maxX += seatPadding;
  minY -= seatPadding;
  maxY += seatPadding;

  const sourceWidth = Math.max(1, maxX - minX);
  const sourceHeight = Math.max(1, maxY - minY);
  const fitScale = Math.min(container.width / sourceWidth, container.height / sourceHeight);
  const smallTableScaleFactor =
    table.seatCount <= 4 ? 0.58 : table.seatCount <= 8 ? 0.74 : 1;
  const scale = fitScale * smallTableScaleFactor;

  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;

  const offsetX = container.x + (container.width - scaledWidth) / 2 - minX * scale;
  const offsetY = container.y + (container.height - scaledHeight) / 2 - minY * scale;

  return {
    scale,
    offsetX,
    offsetY,
    seatRadius: Math.max(11, Math.min(15, 13 * scale + 2)),
  };
}

export function getLegendColumns(items: PrintLegendItem[], rightBox: Box) {
  const rowsPerColumn = getLegendRowsPerColumn(rightBox.height);
  const columnCount = getLegendColumnCount(items.length, rowsPerColumn);
  const columns = splitLegendIntoColumns(items, columnCount);

  const totalGap = Math.max(0, columnCount - 1) * LEGEND_COLUMN_GAP;
  const columnWidth = (rightBox.width - totalGap) / columnCount;

  return columns.map((columnItems, index) => ({
    index,
    x: rightBox.x + index * (columnWidth + LEGEND_COLUMN_GAP),
    width: columnWidth,
    items: columnItems,
  })) as LegendColumn[];
}
