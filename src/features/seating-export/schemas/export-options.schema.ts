import { z } from "zod";

export const exportPaperSchema = z.enum(["A4", "A3"]);
export const exportOrientationSchema = z.enum(["landscape", "portrait"]);
export const detailSeatLabelModeSchema = z.enum(["number", "initials"]);

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanWithDefault(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return TRUE_VALUES.has(value.toLowerCase());
}

export const seatingExportOptionsSchema = z.object({
  paper: exportPaperSchema.default("A4"),
  orientation: exportOrientationSchema.default("landscape"),
  includeEmptySeats: z.boolean().default(true),
  overviewShowSeats: z.boolean().default(false),
  detailSeatLabelMode: detailSeatLabelModeSchema.default("number"),
  locale: z.enum(["en", "pl"]).default("en"),
});

export function parseSeatingExportOptionsFromSearchParams(searchParams: URLSearchParams) {
  return seatingExportOptionsSchema.parse({
    paper: searchParams.get("paper") ?? undefined,
    orientation: searchParams.get("orientation") ?? undefined,
    includeEmptySeats: parseBooleanWithDefault(searchParams.get("includeEmptySeats"), true),
    overviewShowSeats: parseBooleanWithDefault(searchParams.get("overviewShowSeats"), false),
    detailSeatLabelMode: searchParams.get("detailSeatLabelMode") ?? undefined,
    locale: searchParams.get("locale") ?? undefined,
  });
}

export type SeatingExportOptionsInput = z.infer<typeof seatingExportOptionsSchema>;
