import type {
  AssignmentMutation,
  AssignmentMutationResponse,
  DomainEvent,
} from "../types/collaboration.types";

export interface EventTransport {
  sendAssignmentMutation(mutation: AssignmentMutation): Promise<AssignmentMutationResponse>;
  subscribeToRemoteEvents?(
    onEvent: (event: DomainEvent) => void,
  ): () => void;
}

export class HttpEventTransport implements EventTransport {
  constructor(private readonly planId: string) {}

  async sendAssignmentMutation(
    mutation: AssignmentMutation,
  ): Promise<AssignmentMutationResponse> {
    const response = await fetch(`/api/seating-plans/${this.planId}/assignments/mutate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mutation),
    });

    const payload = (await response.json().catch(() => null)) as
      | AssignmentMutationResponse
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        ack: {
          mutationId: mutation.mutationId,
          status: "rejected",
          planVersion: mutation.baseVersion,
          appliedEventIds: [],
        },
        error: payload?.error ?? "Failed to persist mutation",
      };
    }

    return payload as AssignmentMutationResponse;
  }
}

export class SocketEventTransport implements EventTransport {
  async sendAssignmentMutation(
    mutation: AssignmentMutation,
  ): Promise<AssignmentMutationResponse> {
    // Collaboration transport seam: socket-backed transport can replace this implementation later.
    return {
      ack: {
        mutationId: mutation.mutationId,
        status: "rejected",
        planVersion: mutation.baseVersion,
        appliedEventIds: [],
      },
      error: "Socket transport not implemented",
    };
  }
}

