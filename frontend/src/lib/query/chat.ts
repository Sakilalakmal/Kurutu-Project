import { z } from "zod";
import { api } from "@/lib/api/client";
import {
  chatMessagesResponseSchema,
  chatThreadsResponseSchema,
  ensureDiagramThreadResponseSchema,
  postMessageResponseSchema,
} from "@/lib/chat/schemas";

const parseOrThrow = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallbackMessage: string
): T => {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(fallbackMessage);
  }

  return parsed.data;
};

export const fetchChatThreads = async (workspaceId: string) => {
  const body = await api.get<unknown>("/api/chat/threads", {
    query: { workspaceId },
    cache: "no-store",
  });

  return parseOrThrow(
    chatThreadsResponseSchema,
    body,
    "Invalid response while loading chat threads."
  );
};

export const ensureDiagramThread = async (workspaceId: string, diagramId: string) => {
  const body = await api.post<unknown, { workspaceId: string; diagramId: string }>(
    "/api/chat/threads/diagram",
    {
      body: {
        workspaceId,
        diagramId,
      },
    }
  );

  return parseOrThrow(
    ensureDiagramThreadResponseSchema,
    body,
    "Invalid response while creating diagram thread."
  ).thread;
};

export const fetchChatMessagesPage = async (threadId: string, cursor?: string) => {
  const body = await api.get<unknown>("/api/chat/messages", {
    query: {
      threadId,
      cursor,
    },
    cache: "no-store",
  });

  return parseOrThrow(
    chatMessagesResponseSchema,
    body,
    "Invalid response while loading messages."
  );
};

export const postChatMessage = async ({
  threadId,
  content,
  clientMessageId,
}: {
  threadId: string;
  content: string;
  clientMessageId?: string;
}) => {
  const body = await api.post<
    unknown,
    { threadId: string; content: string; clientMessageId?: string }
  >("/api/chat/messages", {
    body: {
      threadId,
      content,
      clientMessageId,
    },
  });

  return parseOrThrow(
    postMessageResponseSchema,
    body,
    "Invalid response while sending message."
  ).message;
};
