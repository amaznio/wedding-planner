import type { RectangleSeatLayout, SeatingTableType } from "@/features/seating-editor/types/seating-plan.types";

export type ExportPaper = "A4" | "A3";
export type ExportOrientation = "landscape" | "portrait";
export type DetailSeatLabelMode = "number" | "initials";

export type SeatingExportOptions = {
  paper: ExportPaper;
  orientation: ExportOrientation;
  includeEmptySeats: boolean;
  overviewShowSeats: boolean;
  detailSeatLabelMode: DetailSeatLabelMode;
  locale: "en" | "pl";
};

export type PrintGuest = {
  guestId: string;
  fullName: string;
  initials: string;
};

export type PrintSeat = {
  seatNumber: number;
  x: number;
  y: number;
  occupied: boolean;
  guest: PrintGuest | null;
};

export type PrintTable = {
  tableId: string;
  label: string;
  type: SeatingTableType;
  seatLayout: RectangleSeatLayout;
  x: number;
  y: number;
  rotation: number;
  seatCount: number;
  occupiedCount: number;
  width: number;
  height: number;
  seats: PrintSeat[];
  overviewCenter?: { x: number; y: number };
  overviewCorners?: Array<{ x: number; y: number }>;
  overviewAabb?: { minX: number; minY: number; maxX: number; maxY: number };
};

export type PrintLegendItem = {
  seatNumber: number;
  guestName: string;
};

export type OverviewPageModel = {
  kind: "overview";
  planName: string;
  width: number;
  height: number;
  tables: PrintTable[];
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type TableDetailPageModel = {
  kind: "table-detail";
  planName: string;
  table: PrintTable;
  legend: PrintLegendItem[];
};

export type SeatingPrintModel = {
  options: SeatingExportOptions;
  pageSizePt: { width: number; height: number };
  overview: OverviewPageModel;
  details: TableDetailPageModel[];
};

export type ExportPlanInput = {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Array<{
    id: string;
    label: string;
    type: SeatingTableType;
    x: number;
    y: number;
    rotation: number;
    seatCount: number;
    seatLayout: RectangleSeatLayout;
  }>;
};

export type ExportGuestInput = {
  id: string;
  name: string;
  isPlaceholderPlusOne: boolean;
  assignment: {
    tableId: string;
    seatNumber: number;
  } | null;
};
