export type RelationshipType = "couple" | "family" | "group" | "custom";

export type PreferredSeating = "adjacent" | "nearby" | "same-table" | "none";

export type SeatingRelationship = {
  id: string;
  planId: string;
  type: RelationshipType;
  name: string | null;
  preferredSeating: PreferredSeating;
  moveTogetherDefault: boolean;
  strict: boolean;
  guestIds: string[];
  members: Array<{ guestId: string; sortOrder: number | null }>;
  createdAt: string;
  updatedAt: string;
};
