import { z } from "zod";
import type { ChatMessageDto } from "@/lib/chat/schemas";

export type RealtimeAck =
  | { ok: true }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export type PresenceState = "online" | "viewing";

export type PresenceUser = {
  id: string;
  name: string;
  image: string | null;
};

export type PresencePayload = {
  workspaceId: string;
  onlineUsers: PresenceUser[];
  viewingDiagramUsers: PresenceUser[];
};

export type DiagramPresenceUser = {
  userId: string;
  name: string;
  color: string;
  lastSeenAt: number;
};

export const authInitPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1).optional(),
  threadId: z.string().trim().min(1).optional(),
});

export const chatSendPayloadSchema = z.object({
  threadId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(1000),
  clientMessageId: z.string().trim().min(1).max(128),
});

export const threadTypingPayloadSchema = z.object({
  threadId: z.string().trim().min(1),
});

export const presenceUpdatePayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1).optional(),
  state: z.enum(["online", "viewing"]),
});

export const diagramRoomPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1),
});
export const diagramPresencePayloadSchema = diagramRoomPayloadSchema;

export const diagramCursorPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  viewport: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      zoom: z.number().finite(),
    })
    .optional(),
});

export const diagramSelectionPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1),
  selectedNodeIds: z.array(z.string().trim().min(1)).max(500),
});

export const diagramDocumentUpdatedPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1).optional(),
});

export type AuthInitPayload = z.infer<typeof authInitPayloadSchema>;
export type ChatSendPayload = z.infer<typeof chatSendPayloadSchema>;
export type ThreadTypingPayload = z.infer<typeof threadTypingPayloadSchema>;
export type PresenceUpdatePayload = z.infer<typeof presenceUpdatePayloadSchema>;
export type DiagramRoomPayload = z.infer<typeof diagramRoomPayloadSchema>;
export type DiagramPresencePayload = DiagramRoomPayload;
export type DiagramCursorPayload = z.infer<typeof diagramCursorPayloadSchema>;
export type DiagramSelectionPayload = z.infer<typeof diagramSelectionPayloadSchema>;
export type DiagramDocumentUpdatedPayload = z.infer<
  typeof diagramDocumentUpdatedPayloadSchema
>;

export type ServerToClientEvents = {
  "chat:newMessage": (payload: {
    message: ChatMessageDto;
    clientMessageId?: string;
    senderUserId: string;
  }) => void;
  "chat:sentAck": (payload: {
    clientMessageId: string;
    messageId: string;
    createdAt: string;
  }) => void;
  "chat:typing": (payload: {
    threadId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  "presence:snapshot": (payload: PresencePayload) => void;
  "presence:update": (payload: PresencePayload) => void;
  "diagram:cursor": (payload: {
    userId: string;
    name: string;
    color: string;
    x: number;
    y: number;
    t: number;
    updatedAt?: number;
  }) => void;
  "diagram:selection": (payload: {
    userId: string;
    name: string;
    color: string;
    selectedNodeIds: string[];
    t: number;
    updatedAt?: number;
  }) => void;
  "diagram:presenceSnapshot": (payload: {
    diagramId: string;
    users: DiagramPresenceUser[];
  }) => void;
  "diagram:userLeft": (payload: { userId: string }) => void;
  "diagram:documentUpdated": (payload: {
    workspaceId: string;
    diagramId: string;
    updatedAt: string;
    byUserId: string;
  }) => void;
};

export type ClientToServerEvents = {
  "auth:init": (payload: AuthInitPayload, ack?: (response: RealtimeAck) => void) => void;
  "chat:send": (payload: ChatSendPayload, ack?: (response: RealtimeAck) => void) => void;
  "chat:typingStart": (
    payload: ThreadTypingPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "chat:typingStop": (
    payload: ThreadTypingPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "presence:update": (
    payload: PresenceUpdatePayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "diagram:join": (
    payload: DiagramRoomPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "diagram:leave": (
    payload: DiagramRoomPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  // Deprecated alias. Prefer diagram:join.
  "diagram:presenceJoin": (
    payload: DiagramRoomPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  // Deprecated alias. Prefer diagram:leave.
  "diagram:presenceLeave": (
    payload: DiagramRoomPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "diagram:cursor": (
    payload: DiagramCursorPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "diagram:selection": (
    payload: DiagramSelectionPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
  "diagram:documentUpdated": (
    payload: DiagramDocumentUpdatedPayload,
    ack?: (response: RealtimeAck) => void
  ) => void;
};

export type InterServerEvents = Record<string, never>;
