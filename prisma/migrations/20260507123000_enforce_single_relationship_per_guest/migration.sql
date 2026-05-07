-- Enforce one relationship per guest within a plan by making each guest appear at most once in relationship members.
ALTER TABLE "SeatingRelationshipMember"
ADD CONSTRAINT "SeatingRelationshipMember_guestId_key" UNIQUE ("guestId");
