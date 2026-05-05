export type SeatingTableType = "rectangle";

export type SeatingTable = {
  id: string;
  label: string;
  type: SeatingTableType;
  x: number;
  y: number;
  rotation: number;
  seatCount: number;
};

export type SeatingPlan = {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: SeatingTable[];
};
