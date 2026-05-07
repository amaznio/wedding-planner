import { z } from "zod";

export const relationshipTypeSchema = z.enum([
  "couple",
  "family",
  "group",
  "custom",
]);

export const preferredSeatingSchema = z.enum([
  "adjacent",
  "nearby",
  "same-table",
  "none",
]);

const relationshipGuestIdsSchema = z
  .array(z.string().min(1))
  .min(2)
  .max(20)
  .superRefine((guestIds, ctx) => {
    const deduped = new Set(guestIds);
    if (deduped.size !== guestIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "guestIds must not contain duplicates",
      });
    }
  });

export const createRelationshipSchema = z.object({
  type: relationshipTypeSchema,
  name: z.string().trim().max(120).optional(),
  guestIds: relationshipGuestIdsSchema,
  preferredSeating: preferredSeatingSchema.default("none"),
  moveTogetherDefault: z.boolean().default(false),
  strict: z.boolean().default(false),
});

export const updateRelationshipSchema = z
  .object({
    type: relationshipTypeSchema.optional(),
    name: z.string().trim().max(120).nullable().optional(),
    preferredSeating: preferredSeatingSchema.optional(),
    moveTogetherDefault: z.boolean().optional(),
    strict: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const replaceRelationshipMembersSchema = z.object({
  guestIds: relationshipGuestIdsSchema,
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
export type ReplaceRelationshipMembersInput = z.infer<
  typeof replaceRelationshipMembersSchema
>;
