import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(1).max(120),
  group: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const updateGuestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  group: z.string().max(120).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const importGuestRowsSchema = z.object({
  rows: z
    .array(
      z.object({
        lineNumber: z.int().min(1),
        name: z.string().trim().min(1).max(120),
        include: z.boolean(),
      }),
    )
    .min(1)
    .max(2000),
});

export const createPlusOneSchema = z.object({
  placeholderName: z.string().trim().min(1).max(120),
});

export const assignSeatSchema = z.object({
  guestId: z.string().min(1),
  tableId: z.string().min(1),
  seatNumber: z.int().min(1).max(50),
});

export const batchMoveAssignmentsSchema = z.object({
  initiatorGuestId: z.string().min(1),
  targetTableId: z.string().min(1),
  targetSeatNumber: z.int().min(1).max(50),
  moveTogetherEnabled: z.boolean(),
  plannedAssignments: z
    .array(
      z.object({
        guestId: z.string().min(1),
        tableId: z.string().min(1),
        seatNumber: z.int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
  context: z.object({
    relationshipIdsConsidered: z.array(z.string().min(1)),
  }),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type ImportGuestRowsInput = z.infer<typeof importGuestRowsSchema>;
export type CreatePlusOneInput = z.infer<typeof createPlusOneSchema>;
export type AssignSeatInput = z.infer<typeof assignSeatSchema>;
export type BatchMoveAssignmentsInput = z.infer<
  typeof batchMoveAssignmentsSchema
>;
