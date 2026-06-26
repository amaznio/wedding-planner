import { z } from "zod";

const tableTypeSchema = z.enum(["rectangle", "circle"]);
const seatLayoutSchema = z.enum(["balanced", "top-only", "bottom-only"]);
const pairSidePreferenceSchema = z.enum(["auto", "male-left", "female-left"]);

const tableSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1).max(100),
  type: tableTypeSchema,
  x: z.int(),
  y: z.int(),
  rotation: z.int(),
  seatCount: z.int().min(1).max(50),
  seatLayout: seatLayoutSchema.default("balanced"),
});

export const createSeatingPlanSchema = z.object({
  name: z.string().min(1).max(120),
  eventId: z.string().min(1).optional(),
  width: z.int().positive().max(10000).default(1600),
  height: z.int().positive().max(10000).default(1000),
  pairSidePreference: pairSidePreferenceSchema.default("auto"),
});

export const updateSeatingPlanSchema = z.object({
  name: z.string().min(1).max(120),
  width: z.int().positive().max(10000),
  height: z.int().positive().max(10000),
  pairSidePreference: pairSidePreferenceSchema.default("auto"),
  tables: z.array(tableSchema),
});

export const updateSeatingPlanMetadataSchema = z.object({
  name: z.string().min(1).max(120),
  eventId: z.string().min(1),
});

export type CreateSeatingPlanInput = z.infer<typeof createSeatingPlanSchema>;
export type UpdateSeatingPlanInput = z.infer<typeof updateSeatingPlanSchema>;
export type UpdateSeatingPlanMetadataInput = z.infer<typeof updateSeatingPlanMetadataSchema>;
