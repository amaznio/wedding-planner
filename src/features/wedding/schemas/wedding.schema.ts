import { z } from "zod";

export const weddingEventTypeSchema = z.enum([
  "wedding",
  "afterparty",
  "bachelor",
  "bachelorette",
  "other",
]);

export const eventInvitationStatusSchema = z.enum(["not_invited", "invited"]);
export const eventRsvpStatusSchema = z.enum(["unknown", "confirmed", "declined", "maybe"]);
export const householdMemberRoleSchema = z.enum(["adult", "child"]);
export const vendorPaymentStatusSchema = z.enum(["not_started", "partial", "paid", "canceled"]);
export const expenseStatusSchema = z.enum(["planned", "committed", "paid", "reimbursed", "canceled"]);
export const weddingTaskStatusSchema = z.enum(["todo", "in_progress", "done"]);
export const weddingTaskPrioritySchema = z.enum(["low", "medium", "high"]);
export const weddingMemberRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const weddingMemberAssignableRoleSchema = z.enum(["editor", "viewer"]);

export const createWeddingSchema = z.object({
  name: z.string().trim().min(1).max(160),
  date: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  location: z.string().trim().max(200).optional(),
  currency: z.string().trim().length(3).default("PLN"),
  notes: z.string().max(2000).optional(),
});

export const updateWeddingSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  date: z.coerce.date().nullable().optional(),
  timezone: z.string().trim().min(1).max(80).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createWeddingEventSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: weddingEventTypeSchema.default("other"),
  startsAt: z.coerce.date().optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateWeddingEventSchema = createWeddingEventSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" },
);

export const createEventTimelineItemSchema = z.object({
  time: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(2000).nullable().optional(),
  sortOrder: z.int().min(0).default(0),
  completed: z.boolean().default(false),
});

export const updateEventTimelineItemSchema = z.object({
  time: z.string().trim().min(1).max(20).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().max(2000).nullable().optional(),
  sortOrder: z.int().min(0).optional(),
  completed: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createWeddingNoteSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(80).nullable().optional(),
  pinned: z.boolean().default(false),
});

export const updateWeddingNoteSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(4000).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  pinned: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const weddingDocumentStatusSchema = z.enum(["draft", "shared", "signed"]);

export const createWeddingDocumentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().max(160).nullable().optional(),
  status: weddingDocumentStatusSchema.default("draft"),
  externalUrl: z.url().max(1000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  eventId: z.string().min(1).nullable().optional(),
  vendorId: z.string().min(1).nullable().optional(),
});

export const updateWeddingDocumentSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  ownerName: z.string().trim().max(160).nullable().optional(),
  status: weddingDocumentStatusSchema.optional(),
  externalUrl: z.url().max(1000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  eventId: z.string().min(1).nullable().optional(),
  vendorId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createWeddingTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueDate: z.coerce.date().nullable().optional(),
  priority: weddingTaskPrioritySchema.default("medium"),
  status: weddingTaskStatusSchema.default("todo"),
  eventId: z.string().min(1).nullable().optional(),
  groupId: z.string().min(1).nullable().optional(),
  assigneeMembershipId: z.string().min(1).nullable().optional(),
});

export const updateWeddingTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  priority: weddingTaskPrioritySchema.optional(),
  status: weddingTaskStatusSchema.optional(),
  eventId: z.string().min(1).nullable().optional(),
  groupId: z.string().min(1).nullable().optional(),
  assigneeMembershipId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createWeddingTaskGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const updateWeddingTaskGroupSchema = createWeddingTaskGroupSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" },
);

export const createWeddingTaskChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  completed: z.boolean().default(false),
  sortOrder: z.int().min(0).optional(),
});

export const updateWeddingTaskChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  sortOrder: z.int().min(0).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createWeddingGuestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sex: z.enum(["male", "female", "unknown"]).default("unknown"),
  ageCategory: z.enum(["adult", "teen", "child", "small_child", "toddler_0_2"]).default("adult"),
  guardianGuestId: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).optional(),
  dietaryRestrictions: z.string().max(300).optional(),
});

export const updateWeddingGuestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  ageCategory: z.enum(["adult", "teen", "child", "small_child", "toddler_0_2"]).optional(),
  guardianGuestId: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  dietaryRestrictions: z.string().max(300).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const upsertEventGuestSchema = z.object({
  invitationStatus: eventInvitationStatusSchema.optional(),
  rsvpStatus: eventRsvpStatusSchema.optional(),
  requiresSeat: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(160),
  notes: z.string().max(2000).optional(),
});

export const updateHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const addHouseholdMemberSchema = z.object({
  guestId: z.string().min(1),
  role: householdMemberRoleSchema.default("adult"),
});

export const updateHouseholdMemberSchema = z.object({
  role: householdMemberRoleSchema,
});

export const createWeddingGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#4F46E5"),
});

export const updateWeddingGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const addWeddingGroupMemberSchema = z.object({
  guestId: z.string().min(1),
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(160).optional(),
  contactEmail: z.string().email().max(160).optional(),
  contactPhone: z.string().trim().max(60).optional(),
  notes: z.string().max(4000).optional(),
  totalCostMinor: z.int().min(0).default(0),
  depositMinor: z.int().min(0).default(0),
  amountPaidMinor: z.int().min(0).default(0),
  paymentStatus: vendorPaymentStatusSchema.default("not_started"),
  dueDate: z.coerce.date().optional(),
  eventIds: z.array(z.string().min(1)).max(200).default([]),
});

export const updateVendorSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  contactName: z.string().trim().max(160).nullable().optional(),
  contactEmail: z.string().email().max(160).nullable().optional(),
  contactPhone: z.string().trim().max(60).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  totalCostMinor: z.int().min(0).optional(),
  depositMinor: z.int().min(0).optional(),
  amountPaidMinor: z.int().min(0).optional(),
  paymentStatus: vendorPaymentStatusSchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
  eventIds: z.array(z.string().min(1)).max(200).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  amountMinor: z.int().min(0),
  currency: z.string().trim().length(3).default("PLN"),
  incurredAt: z.coerce.date().optional(),
  paidBy: z.string().trim().max(120).optional(),
  notes: z.string().max(4000).optional(),
  status: expenseStatusSchema.default("planned"),
  eventId: z.string().min(1).nullable().optional(),
  vendorId: z.string().min(1).nullable().optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  amountMinor: z.int().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  incurredAt: z.coerce.date().optional(),
  paidBy: z.string().trim().max(120).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: expenseStatusSchema.optional(),
  eventId: z.string().min(1).nullable().optional(),
  vendorId: z.string().min(1).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided",
});

export const importWeddingGuestsCsvSchema = z.object({
  csv: z.string().min(1),
  createEventGuestForEventId: z.string().min(1).optional(),
});

export const importExpensesCsvSchema = z.object({
  csv: z.string().min(1),
});

export const addWeddingMemberSchema = z.object({
  email: z.string().trim().email().max(320),
  role: weddingMemberAssignableRoleSchema.default("viewer"),
});

export const updateWeddingMemberSchema = z.object({
  role: weddingMemberAssignableRoleSchema,
});

export const transferWeddingOwnershipSchema = z.object({
  userId: z.string().min(1),
});

export const updateWeddingCoverSchema = z.object({
  secureUrl: z.url().max(1000),
  publicId: z.string().trim().min(1).max(300),
  width: z.int().min(1).max(10000),
  height: z.int().min(1).max(10000),
});
