import { z } from "zod";

export const exportPaperSchema = z.enum(["A4", "A3"]);
export const exportOrientationSchema = z.enum(["landscape", "portrait"]);
export const detailSeatLabelModeSchema = z.enum(["number", "initials"]);
export const pdfThemeSchema = z.enum(["simple", "elegant", "modern"]);

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanWithDefault(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return TRUE_VALUES.has(value.toLowerCase());
}

export const seatingExportOptionsSchema = z.object({
  theme: pdfThemeSchema.default("simple"),
  paper: exportPaperSchema.default("A4"),
  orientation: exportOrientationSchema.default("landscape"),
  includeEmptySeats: z.boolean().default(true),
  overviewShowSeats: z.boolean().default(false),
  detailSeatLabelMode: detailSeatLabelModeSchema.default("number"),
  detailTableVertical: z.boolean().default(false),
  locale: z.enum(["en", "pl"]).default("en"),
});

export function parseSeatingExportOptionsFromSearchParams(searchParams: URLSearchParams) {
  return seatingExportOptionsSchema.parse({
    theme: searchParams.get("theme") ?? undefined,
    paper: searchParams.get("paper") ?? undefined,
    orientation: searchParams.get("orientation") ?? undefined,
    includeEmptySeats: parseBooleanWithDefault(searchParams.get("includeEmptySeats"), true),
    overviewShowSeats: parseBooleanWithDefault(searchParams.get("overviewShowSeats"), false),
    detailSeatLabelMode: searchParams.get("detailSeatLabelMode") ?? undefined,
    detailTableVertical: parseBooleanWithDefault(searchParams.get("detailTableVertical"), false),
    locale: searchParams.get("locale") ?? undefined,
  });
}

export type SeatingExportOptionsInput = z.infer<typeof seatingExportOptionsSchema>;
