import { z } from "zod";

export const createGuestGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateGuestGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type CreateGuestGroupInput = z.infer<typeof createGuestGroupSchema>;
export type UpdateGuestGroupInput = z.infer<typeof updateGuestGroupSchema>;
