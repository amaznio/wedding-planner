import { io, type Socket } from "socket.io-client";

import type {
  AssignmentMutation,
  AssignmentMutationResponse,
  CollaborationEvent,
  CursorAliasToken,
  CursorPresencePayload,
  SocketServerEventsEnvelope,
  TableMutation,
  TableMutationResponse,
} from "../types/collaboration.types";

const SOCKET_ACK_TIMEOUT_MS = 5000;

type SocketMutationKind = "assignment" | "table";

type SocketMutationAck = {
  kind: SocketMutationKind;
  response: AssignmentMutationResponse | TableMutationResponse;
};

type SocketClientMutationEnvelope = {
  kind: SocketMutationKind;
  mutation: AssignmentMutation | TableMutation;
};

export interface EventTransport {
  sendAssignmentMutation(mutation: AssignmentMutation): Promise<AssignmentMutationResponse>;
  sendTableMutation(mutation: TableMutation): Promise<TableMutationResponse>;
  subscribeToRemoteEvents?(onEvent: (event: CollaborationEvent) => void): () => void;
  sendCursorPresence?(payload: { x: number; y: number; aliasToken?: CursorAliasToken }): Promise<void> | void;
  subscribeToCursorPresence?(onPresence: (presence: CursorPresencePayload) => void): () => void;
  onReconnect?(onReconnect: () => void): () => void;
  dispose?(): void;
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
        error: payload?.error ?? "Failed to persist assignment mutation",
      };
    }

    return payload as AssignmentMutationResponse;
  }

  async sendTableMutation(mutation: TableMutation): Promise<TableMutationResponse> {
    const response = await fetch(`/api/seating-plans/${this.planId}/tables/mutate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mutation),
    });

    const payload = (await response.json().catch(() => null)) as
      | TableMutationResponse
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
        error: payload?.error ?? "Failed to persist table mutation",
      };
    }

    return payload as TableMutationResponse;
  }
}

export class SocketEventTransport implements EventTransport {
  private socket: Socket | null = null;

  constructor(
    private readonly planId: string,
    private readonly getToken: () => Promise<string>,
    private readonly getPresenceIdentity: () => {
      participantId: string;
      displayName: string;
      aliasToken?: CursorAliasToken;
      colorKey?: string;
    },
  ) {}

  private async getSocket(): Promise<Socket> {
    if (this.socket) {
      return this.socket;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL;
    if (!socketUrl) {
      throw new Error("Missing NEXT_PUBLIC_SOCKET_IO_URL");
    }

    const token = await this.getToken();
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: {
        token,
        planId: this.planId,
      },
      autoConnect: true,
      withCredentials: true,
    });
    this.socket = socket;
    return socket;
  }

  private async emitMutation(
    kind: SocketMutationKind,
    mutation: AssignmentMutation | TableMutation,
  ): Promise<AssignmentMutationResponse | TableMutationResponse> {
    const socket = await this.getSocket();

    return await new Promise<AssignmentMutationResponse | TableMutationResponse>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          ack: {
            mutationId: mutation.mutationId,
            status: "rejected",
            planVersion: mutation.baseVersion,
            appliedEventIds: [],
          },
          error: "Socket mutation timed out",
        });
      }, SOCKET_ACK_TIMEOUT_MS);

      const envelope: SocketClientMutationEnvelope = {
        kind,
        mutation,
      };

      socket.emit("client_mutation", envelope, (ack: SocketMutationAck | null) => {
        clearTimeout(timeout);
        if (!ack || ack.kind !== kind || !ack.response) {
          resolve({
            ack: {
              mutationId: mutation.mutationId,
              status: "rejected",
              planVersion: mutation.baseVersion,
              appliedEventIds: [],
            },
            error: "Invalid socket acknowledgement",
          });
          return;
        }
        resolve(ack.response);
      });
    });
  }

  async sendAssignmentMutation(
    mutation: AssignmentMutation,
  ): Promise<AssignmentMutationResponse> {
    const result = await this.emitMutation("assignment", mutation);
    return result as AssignmentMutationResponse;
  }

  async sendTableMutation(mutation: TableMutation): Promise<TableMutationResponse> {
    const result = await this.emitMutation("table", mutation);
    return result as TableMutationResponse;
  }

  async sendCursorPresence(payload: { x: number; y: number; aliasToken?: CursorAliasToken }): Promise<void> {
    const socket = await this.getSocket();
    const identity = this.getPresenceIdentity();
    socket.emit("client_cursor_presence", {
      kind: "update",
      participantId: identity.participantId,
      displayName: identity.displayName,
      aliasToken: payload.aliasToken ?? identity.aliasToken,
      colorKey: identity.colorKey,
      x: payload.x,
      y: payload.y,
      updatedAt: new Date().toISOString(),
    } satisfies CursorPresencePayload);
  }

  subscribeToRemoteEvents(onEvent: (event: CollaborationEvent) => void): () => void {
    let active = true;
    void this.getSocket().then((socket) => {
      if (!active) return;
      const handler = (envelope: SocketServerEventsEnvelope) => {
        for (const event of envelope.events ?? []) {
          onEvent(event);
        }
      };
      socket.on("server_events", handler);
    });

    return () => {
      active = false;
      if (this.socket) {
        this.socket.off("server_events");
      }
    };
  }

  subscribeToCursorPresence(onPresence: (presence: CursorPresencePayload) => void): () => void {
    let active = true;
    void this.getSocket().then((socket) => {
      if (!active) return;
      socket.on("server_cursor_presence", onPresence);
    });

    return () => {
      active = false;
      if (this.socket) {
        this.socket.off("server_cursor_presence", onPresence);
      }
    };
  }

  onReconnect(onReconnect: () => void): () => void {
    let active = true;
    void this.getSocket().then((socket) => {
      if (!active) return;
      socket.on("reconnect", onReconnect);
      socket.on("connect", onReconnect);
    });

    return () => {
      active = false;
      if (this.socket) {
        this.socket.off("reconnect", onReconnect);
        this.socket.off("connect", onReconnect);
      }
    };
  }

  dispose(): void {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
}

export class CompositeEventTransport implements EventTransport {
  constructor(
    private readonly socketTransport: EventTransport,
    private readonly httpTransport: EventTransport,
  ) {}

  async sendAssignmentMutation(
    mutation: AssignmentMutation,
  ): Promise<AssignmentMutationResponse> {
    try {
      const socketResult = await this.socketTransport.sendAssignmentMutation(mutation);
      if (!socketResult.error) {
        return socketResult;
      }
    } catch {
      // Fall back to HTTP if socket send fails.
    }
    return this.httpTransport.sendAssignmentMutation(mutation);
  }

  async sendTableMutation(mutation: TableMutation): Promise<TableMutationResponse> {
    try {
      const socketResult = await this.socketTransport.sendTableMutation(mutation);
      if (!socketResult.error) {
        return socketResult;
      }
    } catch {
      // Fall back to HTTP if socket send fails.
    }
    return this.httpTransport.sendTableMutation(mutation);
  }

  subscribeToRemoteEvents(onEvent: (event: CollaborationEvent) => void): () => void {
    return this.socketTransport.subscribeToRemoteEvents?.(onEvent) ?? (() => {});
  }

  sendCursorPresence(payload: { x: number; y: number; aliasToken?: CursorAliasToken }): Promise<void> | void {
    return this.socketTransport.sendCursorPresence?.(payload);
  }

  subscribeToCursorPresence(onPresence: (presence: CursorPresencePayload) => void): () => void {
    return this.socketTransport.subscribeToCursorPresence?.(onPresence) ?? (() => {});
  }

  onReconnect(onReconnect: () => void): () => void {
    return this.socketTransport.onReconnect?.(onReconnect) ?? (() => {});
  }

  dispose(): void {
    this.socketTransport.dispose?.();
    this.httpTransport.dispose?.();
  }
}
