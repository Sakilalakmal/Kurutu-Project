import { z } from "zod";
import {
  chatMessagesResponseSchema,
  chatThreadsResponseSchema,
  ensureDiagramThreadResponseSchema,
  postMessageResponseSchema,
  type ChatMessageDto,
  type ChatThreadDto,
} from "@/lib/chat/schemas";

class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

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

export const getChatThreads = async (workspaceId: string) => {
  const response = await fetch(
    `/api/chat/threads?workspaceId=${encodeURIComponent(workspaceId)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new ChatApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    chatThreadsResponseSchema,
    body,
    "Invalid response while loading chat threads."
  );
};

export const ensureDiagramChatThread = async ({
  workspaceId,
  diagramId,
}: {
  workspaceId: string;
  diagramId: string;
}) => {
  const response = await fetch("/api/chat/threads/diagram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspaceId, diagramId }),
  });

  if (!response.ok) {
    throw new ChatApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    ensureDiagramThreadResponseSchema,
    body,
    "Invalid response while creating diagram thread."
  ).thread;
};

export const getChatMessages = async ({
  threadId,
  cursor,
}: {
  threadId: string;
  cursor?: string;
}) => {
  const query = new URLSearchParams();
  query.set("threadId", threadId);

  if (cursor) {
    query.set("cursor", cursor);
  }

  const response = await fetch(`/api/chat/messages?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ChatApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    chatMessagesResponseSchema,
    body,
    "Invalid response while loading messages."
  );
};

export const sendChatMessage = async ({
  threadId,
  content,
}: {
  threadId: string;
  content: string;
}) => {
  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ threadId, content }),
  });

  if (!response.ok) {
    throw new ChatApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    postMessageResponseSchema,
    body,
    "Invalid response while sending message."
  ).message;
};

export type ChatThreadsResponse = Awaited<ReturnType<typeof getChatThreads>>;
export type ChatThread = ChatThreadDto;
export type ChatMessage = ChatMessageDto;
export { ChatApiError };
