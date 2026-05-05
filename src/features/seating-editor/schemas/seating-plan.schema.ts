import { z } from "zod";

const tableTypeSchema = z.literal("rectangle");

const tableSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().min(1).max(100),
  type: tableTypeSchema,
  x: z.int(),
  y: z.int(),
  rotation: z.int(),
  seatCount: z.int().min(1).max(50),
});

export const createSeatingPlanSchema = z.object({
  name: z.string().min(1).max(120),
  width: z.int().positive().max(10000).default(1600),
  height: z.int().positive().max(10000).default(1000),
});

export const updateSeatingPlanSchema = z.object({
  name: z.string().min(1).max(120),
  width: z.int().positive().max(10000),
  height: z.int().positive().max(10000),
  tables: z.array(tableSchema),
});

export type CreateSeatingPlanInput = z.infer<typeof createSeatingPlanSchema>;
export type UpdateSeatingPlanInput = z.infer<typeof updateSeatingPlanSchema>;
