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

export type AuthInitPayload = z.infer<typeof authInitPayloadSchema>;
export type ChatSendPayload = z.infer<typeof chatSendPayloadSchema>;
export type ThreadTypingPayload = z.infer<typeof threadTypingPayloadSchema>;
export type PresenceUpdatePayload = z.infer<typeof presenceUpdatePayloadSchema>;

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
};

export type InterServerEvents = Record<string, never>;
