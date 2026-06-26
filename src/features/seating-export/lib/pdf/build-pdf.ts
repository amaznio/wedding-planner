import { readFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFPage, degrees, rgb } from "pdf-lib";

import {
  getDetailPageLayout,
  getDiagramPlacement,
  getLegendColumns,
  type Box,
} from "@/features/seating-export/lib/pdf/detail-layout";
import type { PrintLegendItem, SeatingPrintModel } from "@/features/seating-export/types/print-model";
type ThemeColors = (typeof THEME_STYLES)["simple"]["colors"];

const THEME_STYLES = {
  simple: {
    colors: {
      pageBackground: rgb(1, 1, 1),
      tableFill: rgb(1, 1, 1),
      tableBorder: rgb(0.1, 0.1, 0.1),
      seatBorder: rgb(0.15, 0.15, 0.15),
      seatEmptyFill: rgb(1, 1, 1),
      seatOccupiedFill: rgb(0.84, 0.84, 0.84),
      textPrimary: rgb(0.05, 0.05, 0.05),
      textMuted: rgb(0.2, 0.2, 0.2),
    },
    headingFontFamily: "sans" as const,
  },
  elegant: {
    colors: {
      pageBackground: rgb(0.985, 0.975, 0.94),
      tableFill: rgb(0.985, 0.975, 0.94),
      tableBorder: rgb(0.69, 0.61, 0.43),
      seatBorder: rgb(0.73, 0.65, 0.48),
      seatEmptyFill: rgb(0.99, 0.985, 0.965),
      seatOccupiedFill: rgb(0.97, 0.93, 0.83),
      textPrimary: rgb(0.2, 0.18, 0.16),
      textMuted: rgb(0.38, 0.34, 0.3),
    },
    headingFontFamily: "serif" as const,
  },
  modern: {
    colors: {
      pageBackground: rgb(1, 1, 1),
      tableFill: rgb(0.98, 0.98, 0.985),
      tableBorder: rgb(0.15, 0.15, 0.18),
      seatBorder: rgb(0.24, 0.24, 0.28),
      seatEmptyFill: rgb(0.965, 0.965, 0.975),
      seatOccupiedFill: rgb(0.88, 0.92, 0.98),
      textPrimary: rgb(0.08, 0.08, 0.1),
      textMuted: rgb(0.34, 0.34, 0.38),
    },
    headingFontFamily: "sans" as const,
  },
} as const;

const FONT_PATHS = {
  regular: [
    "C:\\Windows\\Fonts\\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-ext-400-normal.woff"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-400-normal.woff"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-ext-400-normal.woff2"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-400-normal.woff2"),
  ],
  bold: [
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-ext-700-normal.woff"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-700-normal.woff"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-ext-700-normal.woff2"),
    path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans", "files", "noto-sans-latin-700-normal.woff2"),
  ],
  serifRegular: [
    "C:\\Windows\\Fonts\\times.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  ],
  serifBold: [
    "C:\\Windows\\Fonts\\timesbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  ],
};

const LABELS = {
  en: {
    seatingOverview: "Seating Overview",
    tables: "tables",
    guestLegend: "Guest legend",
  },
  pl: {
    seatingOverview: "Podgląd ustawienia stołów",
    tables: "stołów",
    guestLegend: "Legenda gości",
  },
} as const;

function invertY(pageHeight: number, yFromTop: number, elementHeight = 0) {
  return pageHeight - yFromTop - elementHeight;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function normalizeDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getReadableTextRotationDegrees(value: number) {
  const normalized = normalizeDegrees(value);
  if (normalized > 90 && normalized <= 270) {
    return normalized - 180;
  }
  return normalized;
}

function rotatePoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
  rotationDegrees: number,
) {
  const radians = toRadians(rotationDegrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function getFontLineHeight(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
) {
  return font.heightAtSize(size, { descender: true });
}

export function getRotatedOverviewTextLayout({
  centerX,
  centerY,
  rotationDegrees,
  tableShortSide,
  labelWidth,
  occupancyWidth,
  occupancyText,
  labelLineHeight,
  occupancyLineHeight,
  occupancyFont,
  labelSize,
  occupancySize,
}: {
  centerX: number;
  centerY: number;
  rotationDegrees: number;
  tableShortSide: number;
  labelWidth: number;
  occupancyWidth: number;
  occupancyText: string;
  labelLineHeight: number;
  occupancyLineHeight: number;
  occupancyFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  labelSize: number;
  occupancySize: number;
}) {
  const effectiveRotationDegrees = getReadableTextRotationDegrees(rotationDegrees);
  const radians = toRadians(effectiveRotationDegrees);
  const u = { x: Math.cos(radians), y: Math.sin(radians) };
  const v = { x: -Math.sin(radians), y: Math.cos(radians) };

  const baseGap = Math.max(2, Math.round(labelSize * 0.35));
  const maxBlockHeight = Math.max(1, tableShortSide * 0.7);

  let effectiveOccupancySize = occupancySize;
  let effectiveOccupancyLineHeight = occupancyLineHeight;
  let effectiveOccupancyWidth = occupancyWidth;
  let effectiveGap = baseGap;

  const initialBlockHeight = labelLineHeight + effectiveOccupancyLineHeight + effectiveGap;
  if (initialBlockHeight > maxBlockHeight) {
    const maxGapFromTable = maxBlockHeight - labelLineHeight - effectiveOccupancyLineHeight;
    effectiveGap = Math.max(1, Math.min(baseGap, maxGapFromTable));
  }

  let blockHeight = labelLineHeight + effectiveOccupancyLineHeight + effectiveGap;
  if (blockHeight > maxBlockHeight && effectiveOccupancySize > 7) {
    effectiveOccupancySize = 7;
    effectiveOccupancyLineHeight = getFontLineHeight(occupancyFont, effectiveOccupancySize);
    effectiveOccupancyWidth = occupancyFont.widthOfTextAtSize(
      occupancyText,
      effectiveOccupancySize,
    );
    const maxGapFromTable = maxBlockHeight - labelLineHeight - effectiveOccupancyLineHeight;
    effectiveGap = Math.max(1, Math.min(baseGap, maxGapFromTable));
    blockHeight = labelLineHeight + effectiveOccupancyLineHeight + effectiveGap;
  }

  const labelCenterOffset = (effectiveGap + effectiveOccupancyLineHeight) / 2;
  const occupancyCenterOffset = -(effectiveGap + labelLineHeight) / 2;
  const labelCenter = {
    x: centerX + v.x * labelCenterOffset,
    y: centerY + v.y * labelCenterOffset,
  };
  const occupancyCenter = {
    x: centerX + v.x * occupancyCenterOffset,
    y: centerY + v.y * occupancyCenterOffset,
  };

  const labelOrigin = {
    x: labelCenter.x - u.x * (labelWidth / 2) - v.x * (labelLineHeight / 2),
    y: labelCenter.y - u.y * (labelWidth / 2) - v.y * (labelLineHeight / 2),
  };
  const occupancyOrigin = {
    x:
      occupancyCenter.x -
      u.x * (effectiveOccupancyWidth / 2) -
      v.x * (effectiveOccupancyLineHeight / 2),
    y:
      occupancyCenter.y -
      u.y * (effectiveOccupancyWidth / 2) -
      v.y * (effectiveOccupancyLineHeight / 2),
  };

  return {
    labelOrigin,
    occupancyOrigin,
    occupancySize: effectiveOccupancySize,
    labelCenter,
    occupancyCenter,
    labelLineHeight,
    occupancyLineHeight: effectiveOccupancyLineHeight,
    effectiveGap,
    textRotationDegrees: effectiveRotationDegrees,
  };
}

function pickEncodableFont(
  value: string,
  fonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>,
) {
  for (const font of fonts) {
    try {
      font.encodeText(value);
      return font;
    } catch {
      // Try next font.
    }
  }
  return fonts[0]!;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fitTextWithEllipsis({
  text,
  font,
  maxWidth,
  size,
}: {
  text: string;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  maxWidth: number;
  size: number;
}) {
  const normalized = normalizeText(text);
  if (font.widthOfTextAtSize(normalized, size) <= maxWidth) {
    return normalized;
  }

  const ellipsis = "…";
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, size);
  if (ellipsisWidth > maxWidth) {
    return "";
  }

  let low = 0;
  let high = normalized.length;
  let best = "";
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${normalized.slice(0, mid).trimEnd()}${ellipsis}`;
    const candidateWidth = font.widthOfTextAtSize(candidate, size);
    if (candidateWidth <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function drawTextSafe({
  page,
  text,
  x,
  y,
  size,
  color,
  fonts,
  maxWidth,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  size: number;
  color: ReturnType<typeof rgb>;
  fonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  maxWidth?: number;
}) {
  const normalized = normalizeText(text);
  const font = pickEncodableFont(normalized, fonts);
  page.drawText(normalized, {
    x,
    y,
    size,
    font,
    color,
    maxWidth,
  });
  return font.widthOfTextAtSize(normalized, size);
}

function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const words = normalizeText(text).split(" ");
  if (!words[0]) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[index] ?? "";
    }
  }

  lines.push(current);
  return lines;
}

function rotatePointClockwise90(x: number, y: number, height: number) {
  return {
    x: height - y,
    y: x,
  };
}

function getDetailRenderTable(
  table: SeatingPrintModel["details"][number]["table"],
  rotateVertical: boolean,
) {
  if (!rotateVertical || table.width <= table.height) {
    return table;
  }

  return {
    ...table,
    width: table.height,
    height: table.width,
    seats: table.seats.map((seat) => {
      const rotated = rotatePointClockwise90(seat.x, seat.y, table.height);
      return {
        ...seat,
        x: rotated.x,
        y: rotated.y,
      };
    }),
  };
}

function drawHeader({
  page,
  pageWidth,
  pageHeight,
  planName,
  tableName,
  occupancy,
  regularFonts,
  headingBoldFonts,
  margin,
  colors,
}: {
  page: PDFPage;
  pageWidth: number;
  pageHeight: number;
  planName: string;
  tableName: string;
  occupancy: string;
  regularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  headingBoldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  margin: number;
  colors: ThemeColors;
}) {
  const top = margin;

  drawTextSafe({
    page,
    text: planName,
    x: margin,
    y: invertY(pageHeight, top + 2, 16),
    size: 16,
    color: colors.textPrimary,
    fonts: headingBoldFonts,
  });

  drawTextSafe({
    page,
    text: `${tableName} • ${occupancy}`,
    x: margin,
    y: invertY(pageHeight, top + 22, 11),
    size: 11,
    color: colors.textMuted,
    fonts: regularFonts,
  });
}

function drawOverviewPage({
  page,
  pageWidth,
  pageHeight,
  printModel,
  regularFonts,
  boldFonts,
  headingBoldFonts,
  labels,
  colors,
}: {
  page: PDFPage;
  pageWidth: number;
  pageHeight: number;
  printModel: SeatingPrintModel;
  regularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  boldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  headingBoldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  labels: (typeof LABELS)["en"] | (typeof LABELS)["pl"];
  colors: ThemeColors;
}) {
  const margin = 24;
  drawHeader({
    page,
    pageWidth,
    pageHeight,
    planName: printModel.overview.planName,
    tableName: labels.seatingOverview,
    occupancy: `${printModel.overview.tables.length} ${labels.tables}`,
    regularFonts,
    headingBoldFonts,
    margin,
    colors,
  });

  for (const table of printModel.overview.tables) {
    const tableCenter = table.overviewCenter ?? {
      x: table.x + table.width / 2,
      y: table.y + table.height / 2,
    };
    const scaledCenterX =
      printModel.overview.offsetX + tableCenter.x * printModel.overview.scale;
    const scaledCenterYTop =
      printModel.overview.offsetY + tableCenter.y * printModel.overview.scale;
    if (table.type === "circle") {
      page.drawCircle({
        x: scaledCenterX,
        y: invertY(pageHeight, scaledCenterYTop),
        size: (table.width / 2) * printModel.overview.scale,
        color: colors.tableFill,
        borderColor: colors.tableBorder,
        borderWidth: 0.8,
      });
    } else {
      const unrotatedCorners = [
        { x: table.x, y: table.y },
        { x: table.x + table.width, y: table.y },
        { x: table.x + table.width, y: table.y + table.height },
        { x: table.x, y: table.y + table.height },
      ];
      const corners = (table.overviewCorners?.length === 4 ? table.overviewCorners : unrotatedCorners).map(
        (corner) => ({
          x: printModel.overview.offsetX + corner.x * printModel.overview.scale,
          y: pageHeight - (printModel.overview.offsetY + corner.y * printModel.overview.scale),
        }),
      );
      const edgePairs = [
        [corners[0]!, corners[1]!],
        [corners[1]!, corners[2]!],
        [corners[2]!, corners[3]!],
        [corners[3]!, corners[0]!],
      ] as const;

      for (const [start, end] of edgePairs) {
        page.drawLine({
          start,
          end,
          color: colors.tableBorder,
          thickness: 0.8,
        });
      }
    }

    page.drawCircle({
      x: scaledCenterX,
      y: invertY(pageHeight, scaledCenterYTop),
      size: 0.4,
      color: colors.tableBorder,
    });

    const label = normalizeText(table.label);
    const occupancy = `${table.occupiedCount}/${table.seatCount}`;
    const labelFont = pickEncodableFont(label, headingBoldFonts);
    const occFont = pickEncodableFont(occupancy, regularFonts);

    const labelSize = 9;
    const occupancySize = 8;
    const labelWidth = labelFont.widthOfTextAtSize(label, labelSize);
    const occupancyWidth = occFont.widthOfTextAtSize(occupancy, occupancySize);
    const labelLineHeight = getFontLineHeight(labelFont, labelSize);
    const occupancyLineHeight = getFontLineHeight(occFont, occupancySize);
    const textLayout = getRotatedOverviewTextLayout({
      centerX: scaledCenterX,
      centerY: invertY(pageHeight, scaledCenterYTop),
      rotationDegrees: table.rotation,
      tableShortSide: Math.min(table.width, table.height) * printModel.overview.scale,
      labelWidth,
      occupancyWidth,
      occupancyText: occupancy,
      labelLineHeight,
      occupancyLineHeight,
      occupancyFont: occFont,
      labelSize,
      occupancySize,
    });

    page.drawText(label, {
      x: textLayout.labelOrigin.x,
      y: textLayout.labelOrigin.y,
      size: labelSize,
      font: labelFont,
      color: colors.textPrimary,
      rotate: degrees(textLayout.textRotationDegrees),
    });

    page.drawText(occupancy, {
      x: textLayout.occupancyOrigin.x,
      y: textLayout.occupancyOrigin.y,
      size: textLayout.occupancySize,
      font: occFont,
      color: colors.textMuted,
      rotate: degrees(textLayout.textRotationDegrees),
    });

    if (printModel.options.overviewShowSeats) {
      const rotationCenter = {
        x: table.x + table.width / 2,
        y: table.y + table.height / 2,
      };
      for (const seat of table.seats) {
        const unrotatedSeatPoint = {
          x: table.x + seat.x,
          y: table.y + seat.y,
        };
        const rotatedSeatPoint = rotatePoint(
          unrotatedSeatPoint,
          rotationCenter,
          table.rotation,
        );
        const seatX =
          printModel.overview.offsetX + rotatedSeatPoint.x * printModel.overview.scale;
        const seatY =
          printModel.overview.offsetY + rotatedSeatPoint.y * printModel.overview.scale;
        page.drawCircle({
          x: seatX,
          y: invertY(pageHeight, seatY),
          size: Math.max(2, 4.5 * printModel.overview.scale),
          color: seat.occupied ? colors.seatOccupiedFill : colors.seatEmptyFill,
          borderColor: colors.seatBorder,
          borderWidth: 0.4,
        });
      }
    }
  }
}

function drawLegendItem({
  page,
  pageHeight,
  item,
  x,
  yTop,
  numberWidth,
  maxNameWidth,
  regularFonts,
  boldFonts,
  colors,
}: {
  page: PDFPage;
  pageHeight: number;
  item: PrintLegendItem;
  x: number;
  yTop: number;
  numberWidth: number;
  maxNameWidth: number;
  regularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  boldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  colors: ThemeColors;
}) {
  const numText = `${item.seatNumber}.`;
  drawTextSafe({
    page,
    text: numText,
    x,
    y: invertY(pageHeight, yTop, 10),
    size: 10,
    color: colors.textPrimary,
    fonts: boldFonts,
  });

  const nameFont = pickEncodableFont(item.guestName, regularFonts);
  const nameLines = wrapText(item.guestName, maxNameWidth, 10, nameFont);
  const firstLine = nameLines[0] ?? "";
  const secondLine = nameLines[1] ?? "";

  page.drawText(firstLine, {
    x: x + numberWidth,
    y: invertY(pageHeight, yTop, 10),
    size: 10,
    font: nameFont,
    color: colors.textPrimary,
    maxWidth: maxNameWidth,
  });

  if (secondLine) {
    page.drawText(secondLine, {
      x: x + numberWidth,
      y: invertY(pageHeight, yTop + 12, 10),
      size: 10,
      font: nameFont,
      color: colors.textPrimary,
      maxWidth: maxNameWidth,
    });
  }
}

function drawDetailPage({
  page,
  pageWidth,
  pageHeight,
  detail,
  detailSeatLabelMode,
  detailTableVertical,
  regularFonts,
  boldFonts,
  headingBoldFonts,
  labels,
  colors,
}: {
  page: PDFPage;
  pageWidth: number;
  pageHeight: number;
  detail: SeatingPrintModel["details"][number];
  detailSeatLabelMode: SeatingPrintModel["options"]["detailSeatLabelMode"];
  detailTableVertical: SeatingPrintModel["options"]["detailTableVertical"];
  regularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  boldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  headingBoldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  labels: (typeof LABELS)["en"] | (typeof LABELS)["pl"];
  colors: ThemeColors;
}) {
  const layout = getDetailPageLayout(pageWidth, pageHeight);
  const renderTable = getDetailRenderTable(detail.table, detailTableVertical);

  drawHeader({
    page,
    pageWidth,
    pageHeight,
    planName: detail.planName,
    tableName: detail.table.label,
    occupancy: `${detail.table.occupiedCount}/${detail.table.seatCount}`,
    regularFonts,
    headingBoldFonts,
    margin: layout.margin,
    colors,
  });

  const leftInner: Box = {
    x: layout.left.x + 10,
    y: layout.left.y + 10,
    width: layout.left.width - 20,
    height: layout.left.height - 20,
  };

  const placement = getDiagramPlacement(renderTable, leftInner);

  const tableX = placement.offsetX;
  const tableY = placement.offsetY;
  const tableWidth = renderTable.width * placement.scale;
  const tableHeight = renderTable.height * placement.scale;

  if (renderTable.type === "circle") {
    page.drawCircle({
      x: tableX + tableWidth / 2,
      y: invertY(pageHeight, tableY + tableHeight / 2),
      size: tableWidth / 2,
      color: colors.tableFill,
      borderColor: colors.tableBorder,
      borderWidth: 1.2,
    });
  } else {
    page.drawRectangle({
      x: tableX,
      y: invertY(pageHeight, tableY, tableHeight),
      width: tableWidth,
      height: tableHeight,
      color: colors.tableFill,
      borderColor: colors.tableBorder,
      borderWidth: 1.2,
    });
  }

  const tableLabel = normalizeText(detail.table.label);
  const tableLabelFont = pickEncodableFont(tableLabel, boldFonts);
  const isVerticalDetailTable = detailTableVertical && detail.table.width > detail.table.height;
  if (!isVerticalDetailTable) {
    const horizontalPadding = 12;
    const labelMaxWidth = Math.max(1, tableWidth - horizontalPadding * 2);
    let tableLabelSize = Math.max(12, Math.min(16, tableHeight * 0.18));
    const minTableLabelSize = 10;
    let fittedLabel = tableLabel;

    while (
      tableLabelSize > minTableLabelSize &&
      tableLabelFont.widthOfTextAtSize(fittedLabel, tableLabelSize) > labelMaxWidth
    ) {
      tableLabelSize -= 1;
    }

    if (tableLabelFont.widthOfTextAtSize(fittedLabel, tableLabelSize) > labelMaxWidth) {
      fittedLabel = fitTextWithEllipsis({
        text: fittedLabel,
        font: tableLabelFont,
        maxWidth: labelMaxWidth,
        size: tableLabelSize,
      });
    }

    if (fittedLabel.length > 0) {
      page.drawText(fittedLabel, {
        x: tableX + tableWidth / 2 - tableLabelFont.widthOfTextAtSize(fittedLabel, tableLabelSize) / 2,
        y: invertY(pageHeight, tableY + tableHeight / 2, tableLabelSize * 0.35),
        size: tableLabelSize,
        font: tableLabelFont,
        color: colors.textMuted,
      });
    }
  }

  for (const seat of renderTable.seats) {
    if (!seat.occupied && !detail.legend.some((item) => item.seatNumber === seat.seatNumber)) {
      continue;
    }

    const seatX = placement.offsetX + seat.x * placement.scale;
    const seatYTop = placement.offsetY + seat.y * placement.scale;

    page.drawCircle({
      x: seatX,
      y: invertY(pageHeight, seatYTop),
      size: placement.seatRadius,
      color: seat.occupied ? colors.seatOccupiedFill : colors.seatEmptyFill,
      borderColor: colors.seatBorder,
      borderWidth: 1,
    });

    if (!seat.occupied) {
      page.drawLine({
        start: { x: seatX - placement.seatRadius * 0.55, y: invertY(pageHeight, seatYTop) - placement.seatRadius * 0.55 },
        end: { x: seatX + placement.seatRadius * 0.55, y: invertY(pageHeight, seatYTop) + placement.seatRadius * 0.55 },
        color: colors.seatBorder,
        thickness: 0.8,
      });
      page.drawLine({
        start: { x: seatX - placement.seatRadius * 0.55, y: invertY(pageHeight, seatYTop) + placement.seatRadius * 0.55 },
        end: { x: seatX + placement.seatRadius * 0.55, y: invertY(pageHeight, seatYTop) - placement.seatRadius * 0.55 },
        color: colors.seatBorder,
        thickness: 0.8,
      });
    }

    const textValue =
      detailSeatLabelMode === "initials" && seat.guest
        ? seat.guest.initials
        : `${seat.seatNumber}`;

    const textFont = pickEncodableFont(textValue, boldFonts);
    const size = Math.max(9, Math.min(11, placement.seatRadius * 0.7));
    const textWidth = textFont.widthOfTextAtSize(textValue, size);
    page.drawText(textValue, {
      x: seatX - textWidth / 2,
      y: invertY(pageHeight, seatYTop, size * 0.45),
      size,
      font: textFont,
      color: colors.textPrimary,
    });
  }

  const legendTitleYTop = layout.right.y - 8;
  drawTextSafe({
    page,
    text: labels.guestLegend,
    x: layout.right.x,
    y: invertY(pageHeight, legendTitleYTop + 4, 12),
    size: 12,
    color: colors.textPrimary,
    fonts: headingBoldFonts,
  });

  const legendColumns = getLegendColumns(detail.legend, layout.right);
  const legendStartYTop = layout.right.y + 24;
  const maxItemsInColumn = Math.max(
    1,
    ...legendColumns.map((column) => column.items.length),
  );
  const legendBottomYTop = layout.right.y + layout.right.height - 2;
  const availableLegendHeight = Math.max(1, legendBottomYTop - legendStartYTop);
  const baseRowHeight = 24;
  const stretchThreshold = 10;
  const dynamicRowHeight =
    maxItemsInColumn <= stretchThreshold
      ? baseRowHeight
      : Math.max(baseRowHeight, availableLegendHeight / maxItemsInColumn);

  for (const column of legendColumns) {
    let yTop = legendStartYTop;
    const numberWidth = 30;
    const nameWidth = column.width - numberWidth - 6;

    for (const item of column.items) {
      drawLegendItem({
        page,
        pageHeight,
        item,
        x: column.x,
        yTop,
        numberWidth,
        maxNameWidth: nameWidth,
        regularFonts,
        boldFonts,
        colors,
      });
      yTop += dynamicRowHeight;
    }
  }
}

export async function buildSeatingPlanPdf(printModel: SeatingPrintModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let regularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  let boldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  let serifRegularFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  let serifBoldFonts: Array<Awaited<ReturnType<PDFDocument["embedFont"]>>>;
  const locale = printModel.options.locale;
  const labels = LABELS[locale];
  const themeStyle = THEME_STYLES[printModel.options.theme];
  const colors = themeStyle.colors;

  async function embedFromCandidates(paths: string[]) {
    for (const candidate of paths) {
      try {
        const bytes = await readFile(candidate);
        return await pdf.embedFont(bytes, { subset: true });
      } catch {
        // Try next candidate.
      }
    }
    throw new Error(`Failed to embed any candidate font from: ${paths.join(", ")}`);
  }

  try {
    pdf.registerFontkit(fontkit);
    const regularFont = await embedFromCandidates(FONT_PATHS.regular);
    const boldFont = await embedFromCandidates(FONT_PATHS.bold);
    const serifRegularFont = await embedFromCandidates(FONT_PATHS.serifRegular);
    const serifBoldFont = await embedFromCandidates(FONT_PATHS.serifBold);
    regularFonts = [regularFont];
    boldFonts = [boldFont];
    serifRegularFonts = [serifRegularFont];
    serifBoldFonts = [serifBoldFont];
  } catch (error) {
    console.error("seating_pdf_font_embed_failed_fallback_standard", {
      error: error instanceof Error ? error.message : String(error),
    });
    const regularFont = await pdf.embedFont("Helvetica");
    const boldFont = await pdf.embedFont("Helvetica-Bold");
    const serifRegularFont = await pdf.embedFont("Times-Roman");
    const serifBoldFont = await pdf.embedFont("Times-Bold");
    regularFonts = [regularFont];
    boldFonts = [boldFont];
    serifRegularFonts = [serifRegularFont];
    serifBoldFonts = [serifBoldFont];
  }

  const headingBoldFonts =
    themeStyle.headingFontFamily === "serif" ? serifBoldFonts : boldFonts;

  const { width: pageWidth, height: pageHeight } = printModel.pageSizePt;

  const overviewPage = pdf.addPage([pageWidth, pageHeight]);
  overviewPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: colors.pageBackground });
  drawOverviewPage({
    page: overviewPage,
    pageWidth,
    pageHeight,
    printModel,
    regularFonts,
    boldFonts,
    headingBoldFonts,
    labels,
    colors,
  });

  for (const detail of printModel.details) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: colors.pageBackground });
    drawDetailPage({
      page,
      pageWidth,
      pageHeight,
      detail,
      detailSeatLabelMode: printModel.options.detailSeatLabelMode,
      detailTableVertical: printModel.options.detailTableVertical,
      regularFonts,
      boldFonts,
      headingBoldFonts,
      labels,
      colors,
    });
  }

  return pdf.save();
}

