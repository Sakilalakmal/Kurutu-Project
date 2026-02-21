import { z } from "zod";
import { workspaceMemberRoles } from "@/lib/workspace/types";

export const chatThreadTypeSchema = z.enum(["WORKSPACE_GENERAL", "DIAGRAM"]);

export const workspaceIdSchema = z.string().trim().min(1);
export const threadIdSchema = z.string().trim().min(1);
export const diagramIdSchema = z.string().trim().min(1);
export const cursorSchema = z.string().trim().min(1);

export const getThreadsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const getMessagesQuerySchema = z.object({
  threadId: threadIdSchema,
  cursor: cursorSchema.optional(),
});

export const createDiagramThreadSchema = z.object({
  workspaceId: workspaceIdSchema,
  diagramId: diagramIdSchema,
});

export const postMessageSchema = z.object({
  threadId: threadIdSchema,
  content: z.string().trim().min(1).max(1000),
});

export const chatThreadDiagramSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});

export const chatThreadSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  type: chatThreadTypeSchema,
  diagramId: z.string().nullable(),
  title: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  diagram: chatThreadDiagramSchema.nullable(),
});

export const chatMessageSenderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  image: z.string().nullable(),
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  workspaceId: z.string().min(1),
  senderUserId: z.string().min(1),
  content: z.string(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
  sender: chatMessageSenderSchema,
});

export const chatThreadsResponseSchema = z.object({
  workspace: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  currentRole: z.enum(workspaceMemberRoles),
  threads: z.array(chatThreadSchema),
});

export const ensureDiagramThreadResponseSchema = z.object({
  thread: chatThreadSchema,
});

export const chatMessagesResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
  nextCursor: z.string().nullable(),
});

export const postMessageResponseSchema = z.object({
  message: chatMessageSchema,
});

export type ChatThreadDto = z.infer<typeof chatThreadSchema>;
export type ChatMessageDto = z.infer<typeof chatMessageSchema>;