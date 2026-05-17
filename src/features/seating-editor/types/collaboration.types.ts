export type DomainEvent<EntityType extends string = string, Payload = unknown> = {
  eventId: string;
  entityType: EntityType;
  entityId: string;
  actionType: string;
  actorId: string | null;
  clientVersion: number;
  serverVersion: number;
  occurredAt: string;
  payload: Payload;
};

export type AssignmentMutationIntent = "assign" | "unassign" | "batch_move";

export type AssignmentMutationPayload =
  | {
      guestId: string;
      tableId: string;
      seatNumber: number;
    }
  | {
      guestId: string;
    }
  | {
      initiatorGuestId: string;
      targetTableId: string;
      targetSeatNumber: number;
      moveTogetherEnabled: boolean;
      plannedAssignments: Array<{
        guestId: string;
        tableId: string;
        seatNumber: number;
      }>;
      context: { relationshipIdsConsidered: string[] };
    };

export type AssignmentMutation = {
  mutationId: string;
  baseVersion: number;
  intent: AssignmentMutationIntent;
  payload: AssignmentMutationPayload;
  createdAt: string;
};

export type AssignmentEventPayload =
  | {
      intent: "assign";
      guestId: string;
      tableId: string;
      seatNumber: number;
      swappedGuestId: string | null;
    }
  | {
      intent: "unassign";
      guestId: string;
    }
  | {
      intent: "batch_move";
      guestIds: string[];
      targetTableId: string;
      targetSeatNumber: number;
    };

export type AssignmentDomainEvent = DomainEvent<"assignment", AssignmentEventPayload>;

export type AssignmentMutationAck = {
  mutationId: string;
  status: "applied" | "rejected" | "transformed";
  planVersion: number;
  appliedEventIds: string[];
};

export type AssignmentSnapshotDelta = {
  guestsAssignments: Array<{
    guestId: string;
    assignment: {
      id: string;
      planId: string;
      tableId: string;
      guestId: string;
      seatNumber: number;
    } | null;
    plannedTableId: string | null;
  }>;
};

export type AssignmentMutationResponse = {
  ack: AssignmentMutationAck;
  events?: AssignmentDomainEvent[];
  snapshotDelta?: AssignmentSnapshotDelta;
  error?: string;
};

