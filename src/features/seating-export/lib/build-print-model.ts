import { getSeatPositions } from "@/features/seating-editor/lib/seat-positioning";
import { getRectangleTableDimensions } from "@/features/seating-editor/lib/table-dimensions";
import type {
  ExportGuestInput,
  ExportPlanInput,
  PrintLegendItem,
  PrintSeat,
  PrintTable,
  SeatingExportOptions,
  SeatingPrintModel,
} from "@/features/seating-export/types/print-model";

const PAGE_SIZE_BY_PAPER = {
  A4: { width: 841.89, height: 595.28 },
  A3: { width: 1190.55, height: 841.89 },
} as const;

function normalizeRotationDegrees(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function rotatePointAroundCenter(
  point: { x: number; y: number },
  center: { x: number; y: number },
  rotationDegrees: number,
) {
  const radians = toRadians(normalizeRotationDegrees(rotationDegrees));
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function getRotatedTableGeometry(table: { x: number; y: number; width: number; height: number; rotation: number }) {
  const center = {
    x: table.x + table.width / 2,
    y: table.y + table.height / 2,
  };
  const corners = [
    { x: table.x, y: table.y },
    { x: table.x + table.width, y: table.y },
    { x: table.x + table.width, y: table.y + table.height },
    { x: table.x, y: table.y + table.height },
  ].map((corner) => rotatePointAroundCenter(corner, center, table.rotation));

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  return {
    center,
    corners,
    aabb: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function normalizeTableLabel(label: string, index: number): string {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : `Table ${index + 1}`;
}

function getPageSize(paper: SeatingExportOptions["paper"], orientation: SeatingExportOptions["orientation"]) {
  const base = PAGE_SIZE_BY_PAPER[paper];
  if (orientation === "landscape") {
    return {
      width: Math.max(base.width, base.height),
      height: Math.min(base.width, base.height),
    };
  }

  return {
    width: Math.min(base.width, base.height),
    height: Math.max(base.width, base.height),
  };
}

function getOverviewTransform({
  plan,
  tables,
  pageWidth,
  pageHeight,
}: {
  plan: ExportPlanInput;
  tables: PrintTable[];
  pageWidth: number;
  pageHeight: number;
}) {
  if (tables.length === 0) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const padding = 40;
  const headerSpace = 48;
  const contentWidth = Math.max(1, pageWidth - padding * 2);
  const contentHeight = Math.max(1, pageHeight - padding * 2 - headerSpace);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const table of tables) {
    const aabb = table.overviewAabb ?? {
      minX: table.x,
      minY: table.y,
      maxX: table.x + table.width,
      maxY: table.y + table.height,
    };
    minX = Math.min(minX, aabb.minX);
    minY = Math.min(minY, aabb.minY);
    maxX = Math.max(maxX, aabb.maxX);
    maxY = Math.max(maxY, aabb.maxY);
  }

  const sourceWidth = Math.max(1, maxX - minX);
  const sourceHeight = Math.max(1, maxY - minY);

  const scale = Math.min(contentWidth / sourceWidth, contentHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  const offsetX = padding + (contentWidth - renderedWidth) / 2 - minX * scale;
  const offsetY = padding + headerSpace + (contentHeight - renderedHeight) / 2 - minY * scale;

  return { scale, offsetX, offsetY };
}

export function buildSeatingPrintModel({
  plan,
  guests,
  options,
}: {
  plan: ExportPlanInput;
  guests: ExportGuestInput[];
  options: SeatingExportOptions;
}): SeatingPrintModel {
  const pageSizePt = getPageSize(options.paper, options.orientation);

  const guestByTableSeat = new Map<string, ExportGuestInput>();
  for (const guest of guests) {
    if (!guest.assignment) continue;
    guestByTableSeat.set(`${guest.assignment.tableId}:${guest.assignment.seatNumber}`, guest);
  }

  const tables: PrintTable[] = plan.tables.map((table, index) => {
    const dimensions = getRectangleTableDimensions(table.seatCount, table.seatLayout);
    const rawSeats = getSeatPositions(
      table.seatCount,
      dimensions.width,
      dimensions.height,
      table.seatLayout,
    );

    const seats: PrintSeat[] = rawSeats.map((seat) => {
      const guest = guestByTableSeat.get(`${table.id}:${seat.seatNumber}`);
      const displayName = guest?.isPlaceholderPlusOne
        ? options.locale === "pl"
          ? "Osoba Towarzysząca"
          : "Plus One"
        : (guest?.name ?? "");

      return {
        seatNumber: seat.seatNumber,
        x: seat.x,
        y: seat.y,
        occupied: Boolean(guest),
        guest: guest
          ? {
              guestId: guest.id,
              fullName: displayName,
              initials: getInitials(displayName),
            }
          : null,
      };
    });
    const geometry = getRotatedTableGeometry({
      x: table.x,
      y: table.y,
      width: dimensions.width,
      height: dimensions.height,
      rotation: table.rotation,
    });

    return {
      tableId: table.id,
      label: normalizeTableLabel(table.label, index),
      type: table.type,
      seatLayout: table.seatLayout,
      x: table.x,
      y: table.y,
      rotation: table.rotation,
      seatCount: table.seatCount,
      occupiedCount: seats.filter((seat) => seat.occupied).length,
      width: dimensions.width,
      height: dimensions.height,
      seats,
      overviewCenter: geometry.center,
      overviewCorners: geometry.corners,
      overviewAabb: geometry.aabb,
    };
  });

  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  const detailTables = [...tables].sort((a, b) => collator.compare(a.label, b.label));

  const details = detailTables.map((table) => {
    const legend: PrintLegendItem[] = table.seats
      .filter((seat) => (options.includeEmptySeats ? true : seat.occupied))
      .map((seat) => ({
        seatNumber: seat.seatNumber,
        guestName: seat.guest?.fullName ?? "(empty)",
      }));

    return {
      kind: "table-detail" as const,
      planName: plan.name,
      table,
      legend,
    };
  });

  const overviewTransform = getOverviewTransform({
    plan,
    tables,
    pageWidth: pageSizePt.width,
    pageHeight: pageSizePt.height,
  });

  return {
    options,
    pageSizePt,
    overview: {
      kind: "overview",
      planName: plan.name,
      width: plan.width,
      height: plan.height,
      tables,
      scale: overviewTransform.scale,
      offsetX: overviewTransform.offsetX,
      offsetY: overviewTransform.offsetY,
    },
    details,
  };
}
