import type { ChatMessageDto, ChatThreadDto } from "@/lib/chat/schemas";
import { ApiClientError } from "@/lib/api/client";
import {
  ensureDiagramThread,
  fetchChatMessagesPage,
  fetchChatThreads,
  postChatMessage,
} from "@/lib/query/chat";

export const getChatThreads = fetchChatThreads;

export const ensureDiagramChatThread = async ({
  workspaceId,
  diagramId,
}: {
  workspaceId: string;
  diagramId: string;
}) => ensureDiagramThread(workspaceId, diagramId);

export const getChatMessages = async ({
  threadId,
  cursor,
}: {
  threadId: string;
  cursor?: string;
}) => fetchChatMessagesPage(threadId, cursor);

export const sendChatMessage = postChatMessage;

export type ChatThreadsResponse = Awaited<ReturnType<typeof getChatThreads>>;
export type ChatThread = ChatThreadDto;
export type ChatMessage = ChatMessageDto;
export { ApiClientError as ChatApiError };
