import { z } from "zod";

export const guestSexSchema = z.enum(["male", "female", "unknown"]);
export const guestAgeCategorySchema = z.enum(["adult", "teen", "child", "small_child", "toddler_0_2"]);

export const createGuestSchema = z.object({
  name: z.string().min(1).max(120),
  sex: guestSexSchema.default("unknown"),
  ageCategory: guestAgeCategorySchema.default("adult"),
  groupId: z.string().min(1).optional(),
  plannedTableId: z.string().min(1).nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const updateGuestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sex: guestSexSchema.optional(),
  ageCategory: guestAgeCategorySchema.optional(),
  groupId: z.string().min(1).nullable().optional(),
  plannedTableId: z.string().min(1).nullable().optional(),
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

const mutationBaseSchema = z.object({
  mutationId: z.string().min(1),
  baseVersion: z.int().min(0),
});

const seatLayoutSchema = z.enum(["balanced", "top-only", "bottom-only"]);
const tableTypeSchema = z.enum(["rectangle", "circle"]);

export const assignmentMutationSchema = z.discriminatedUnion("intent", [
  mutationBaseSchema.extend({
    intent: z.literal("assign"),
    payload: assignSeatSchema,
  }),
  mutationBaseSchema.extend({
    intent: z.literal("unassign"),
    payload: z.object({
      guestId: z.string().min(1),
    }),
  }),
  mutationBaseSchema.extend({
    intent: z.literal("batch_move"),
    payload: batchMoveAssignmentsSchema,
  }),
]);

export const tableMutationSchema = z.discriminatedUnion("intent", [
  mutationBaseSchema.extend({
    intent: z.literal("move_table"),
    payload: z.object({
      tableId: z.string().min(1),
      x: z.int(),
      y: z.int(),
    }),
  }),
  mutationBaseSchema.extend({
    intent: z.literal("update_table"),
    payload: z.object({
      tableId: z.string().min(1),
      label: z.string().min(1).max(100).optional(),
      seatCount: z.int().min(1).max(50).optional(),
      seatLayout: seatLayoutSchema.optional(),
    }),
  }),
  mutationBaseSchema.extend({
    intent: z.literal("add_table"),
    payload: z.object({
      table: z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(100),
        type: tableTypeSchema,
        x: z.int(),
        y: z.int(),
        rotation: z.int(),
        seatCount: z.int().min(1).max(50),
        seatLayout: seatLayoutSchema,
      }),
    }),
  }),
  mutationBaseSchema.extend({
    intent: z.literal("delete_table"),
    payload: z.object({
      tableId: z.string().min(1),
    }),
  }),
  mutationBaseSchema.extend({
    intent: z.literal("rotate_table"),
    payload: z.object({
      tableId: z.string().min(1),
      rotation: z.int(),
    }),
  }),
]);

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type ImportGuestRowsInput = z.infer<typeof importGuestRowsSchema>;
export type CreatePlusOneInput = z.infer<typeof createPlusOneSchema>;
export type AssignSeatInput = z.infer<typeof assignSeatSchema>;
export type BatchMoveAssignmentsInput = z.infer<
  typeof batchMoveAssignmentsSchema
>;
export type AssignmentMutationInput = z.infer<typeof assignmentMutationSchema>;
export type TableMutationInput = z.infer<typeof tableMutationSchema>;
