export type SeatingTableType = "rectangle";
export type RectangleSeatLayout = "balanced" | "top-only" | "bottom-only";

export type SeatingTable = {
  id: string;
  label: string;
  type: SeatingTableType;
  x: number;
  y: number;
  rotation: number;
  seatCount: number;
  seatLayout: RectangleSeatLayout;
};

export type SeatingPlan = {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: SeatingTable[];
};
