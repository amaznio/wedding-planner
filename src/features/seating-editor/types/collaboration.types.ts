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
export type TableMutationIntent =
  | "move_table"
  | "update_table"
  | "add_table"
  | "delete_table"
  | "rotate_table";

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

export type TableMutationPayload =
  | {
      tableId: string;
      x: number;
      y: number;
    }
  | {
      tableId: string;
      label?: string;
      seatCount?: number;
      seatLayout?: "balanced" | "top-only" | "bottom-only";
    }
  | {
      table: {
        id: string;
        label: string;
        type: "rectangle";
        x: number;
        y: number;
        rotation: number;
        seatCount: number;
        seatLayout: "balanced" | "top-only" | "bottom-only";
      };
    }
  | {
      tableId: string;
    }
  | {
      tableId: string;
      rotation: number;
    };

export type AssignmentMutation = {
  mutationId: string;
  baseVersion: number;
  intent: AssignmentMutationIntent;
  payload: AssignmentMutationPayload;
  createdAt: string;
};

export type TableMutation = {
  mutationId: string;
  baseVersion: number;
  intent: TableMutationIntent;
  payload: TableMutationPayload;
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

export type TableEventPayload =
  | {
      intent: "move_table";
      tableId: string;
      x: number;
      y: number;
    }
  | {
      intent: "update_table";
      tableId: string;
      label: string;
      seatCount: number;
      seatLayout: "balanced" | "top-only" | "bottom-only";
    }
  | {
      intent: "add_table";
      tableId: string;
    }
  | {
      intent: "delete_table";
      tableId: string;
    }
  | {
      intent: "rotate_table";
      tableId: string;
      rotation: number;
    };

export type AssignmentDomainEvent = DomainEvent<"assignment", AssignmentEventPayload>;
export type TableDomainEvent = DomainEvent<"table", TableEventPayload>;

export type MutationAck = {
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

export type TableSnapshotDelta = {
  tables: Array<{
    table: {
      id: string;
      label: string;
      type: "rectangle";
      x: number;
      y: number;
      rotation: number;
      seatCount: number;
      seatLayout: "balanced" | "top-only" | "bottom-only";
    } | null;
  }>;
  removedTableIds?: string[];
};

export type AssignmentMutationResponse = {
  ack: MutationAck;
  events?: AssignmentDomainEvent[];
  snapshotDelta?: AssignmentSnapshotDelta;
  error?: string;
};

export type TableMutationResponse = {
  ack: MutationAck;
  events?: TableDomainEvent[];
  snapshotDelta?: TableSnapshotDelta;
  error?: string;
};

export type CollaborationEvent = AssignmentDomainEvent | TableDomainEvent;

export type CollaborationMutation =
  | {
      kind: "assignment";
      mutation: AssignmentMutation;
    }
  | {
      kind: "table";
      mutation: TableMutation;
    };

export type CollaborationMutationResponse =
  | {
      kind: "assignment";
      response: AssignmentMutationResponse;
    }
  | {
      kind: "table";
      response: TableMutationResponse;
    };

export type SocketServerAckEnvelope = {
  kind: "assignment" | "table";
  ack: MutationAck;
  error?: string;
};

export type SocketServerEventsEnvelope = {
  kind: "assignment" | "table";
  events: CollaborationEvent[];
  snapshotDelta?: AssignmentSnapshotDelta | TableSnapshotDelta;
};
