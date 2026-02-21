import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../app/lib/prisma";
import {
  type ChatMessageDto,
  type ChatThreadDto,
} from "./schemas";
import { requireUser, requireWorkspaceMember } from "../workspace/authz";

class ChatServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const threadWithDiagramInclude = {
  diagram: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.ChatThreadInclude;

const messageWithSenderInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} satisfies Prisma.ChatMessageInclude;

type ThreadWithDiagram = Prisma.ChatThreadGetPayload<{
  include: typeof threadWithDiagramInclude;
}>;

type MessageWithSender = Prisma.ChatMessageGetPayload<{
  include: typeof messageWithSenderInclude;
}>;

const toThreadDto = (thread: ThreadWithDiagram): ChatThreadDto => ({
  id: thread.id,
  workspaceId: thread.workspaceId,
  type: thread.type,
  diagramId: thread.diagramId,
  title: thread.title,
  createdAt: thread.createdAt.toISOString(),
  updatedAt: thread.updatedAt.toISOString(),
  diagram: thread.diagram
    ? {
        id: thread.diagram.id,
        title: thread.diagram.title,
      }
    : null,
});

const toMessageDto = (message: MessageWithSender): ChatMessageDto => ({
  id: message.id,
  threadId: message.threadId,
  workspaceId: message.workspaceId,
  senderUserId: message.senderUserId,
  clientMessageId: message.clientMessageId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
  editedAt: message.editedAt?.toISOString() ?? null,
  deletedAt: message.deletedAt?.toISOString() ?? null,
  sender: {
    id: message.sender.id,
    name: message.sender.name,
    image: message.sender.image,
  },
});

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const isCursorError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

const isChatStorageNotReadyError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2021" || error.code === "P2022");

const toDiagramThreadTitle = (diagramTitle: string) => {
  const normalized = diagramTitle.trim().length > 0 ? diagramTitle.trim() : "Untitled Diagram";

  return `Diagram: ${normalized}`;
};

const findGeneralThread = async (workspaceId: string) => {
  return prisma.chatThread.findFirst({
    where: {
      workspaceId,
      type: "WORKSPACE_GENERAL",
    },
    include: threadWithDiagramInclude,
  });
};

const ensureGeneralThreadRecord = async (workspaceId: string): Promise<ThreadWithDiagram> => {
  const existing = await findGeneralThread(workspaceId);

  if (existing) {
    return existing;
  }

  try {
    return await prisma.chatThread.create({
      data: {
        workspaceId,
        type: "WORKSPACE_GENERAL",
        title: "#general",
      },
      include: threadWithDiagramInclude,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const thread = await findGeneralThread(workspaceId);

    if (thread) {
      return thread;
    }

    throw error;
  }
};

const ensureDiagramThreadRecord = async (
  workspaceId: string,
  diagramId: string
): Promise<ThreadWithDiagram> => {
  const diagram = await prisma.diagram.findFirst({
    where: {
      id: diagramId,
      workspaceId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!diagram) {
    throw new ChatServiceError(404, "Diagram not found.");
  }

  const title = toDiagramThreadTitle(diagram.title);

  return prisma.chatThread.upsert({
    where: {
      workspaceId_diagramId: {
        workspaceId,
        diagramId,
      },
    },
    create: {
      workspaceId,
      type: "DIAGRAM",
      diagramId,
      title,
    },
    update: {
      title,
    },
    include: threadWithDiagramInclude,
  });
};

const resolveThreadForMember = async (threadId: string, userId?: string) => {
  const thread = await prisma.chatThread.findUnique({
    where: {
      id: threadId,
    },
  });

  if (!thread) {
    throw new ChatServiceError(404, "Thread not found.");
  }

  const member = await requireWorkspaceMember(thread.workspaceId, userId);

  return {
    thread,
    member,
  };
};

export const requireChatWorkspaceMember = async (workspaceId: string, userId?: string) => {
  return requireWorkspaceMember(workspaceId, userId);
};

export const ensureGeneralThread = async (workspaceId: string, userId?: string) => {
  await requireChatWorkspaceMember(workspaceId, userId);

  const thread = await ensureGeneralThreadRecord(workspaceId);

  return toThreadDto(thread);
};

export const ensureDiagramThread = async (
  workspaceId: string,
  diagramId: string,
  userId?: string
) => {
  await requireChatWorkspaceMember(workspaceId, userId);

  const thread = await ensureDiagramThreadRecord(workspaceId, diagramId);

  return toThreadDto(thread);
};

export const listWorkspaceThreads = async (workspaceId: string, userId?: string) => {
  const member = await requireChatWorkspaceMember(workspaceId, userId);
  const generalThread = await ensureGeneralThreadRecord(workspaceId);
  const diagramThreads = await prisma.chatThread.findMany({
    where: {
      workspaceId,
      type: "DIAGRAM",
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: threadWithDiagramInclude,
  });

  return {
    workspace: {
      id: member.workspace.id,
      name: member.workspace.name,
    },
    currentRole: member.role,
    threads: [generalThread, ...diagramThreads].map(toThreadDto),
  };
};

export const listMessagesPage = async (
  threadId: string,
  cursor?: string,
  userId?: string
) => {
  await resolveThreadForMember(threadId, userId);

  let messages: MessageWithSender[];

  try {
    messages = await prisma.chatMessage.findMany({
      where: {
        threadId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
      include: messageWithSenderInclude,
    });
  } catch (error) {
    if (isCursorError(error)) {
      throw new ChatServiceError(400, "Invalid cursor.");
    }

    throw error;
  }

  const hasMore = messages.length > 50;
  const page = hasMore ? messages.slice(0, 50) : messages;

  return {
    messages: page.map(toMessageDto),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
};

export const createMessage = async (
  threadId: string,
  content: string,
  userId?: string,
  clientMessageId?: string
) => {
  const resolvedUserId = userId ?? (await requireUser()).userId;
  const { member, thread } = await resolveThreadForMember(threadId, resolvedUserId);

  if (member.role === "VIEWER") {
    throw new ChatServiceError(403, "Forbidden");
  }

  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new ChatServiceError(400, "Message content is required.");
  }

  if (normalizedContent.length > 1000) {
    throw new ChatServiceError(400, "Message content exceeds 1000 characters.");
  }

  const normalizedClientMessageId = clientMessageId?.trim() || null;

  const createMessageRecord = async () => {
    return prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          threadId: thread.id,
          workspaceId: thread.workspaceId,
          senderUserId: resolvedUserId,
          clientMessageId: normalizedClientMessageId,
          content: normalizedContent,
        },
        include: messageWithSenderInclude,
      });

      await tx.chatThread.update({
        where: {
          id: thread.id,
        },
        data: {
          updatedAt: new Date(),
        },
      });

      return created;
    });
  };

  try {
    const message = await createMessageRecord();

    return {
      message: toMessageDto(message),
      wasDuplicate: false,
    };
  } catch (error) {
    if (!normalizedClientMessageId || !isUniqueConstraintError(error)) {
      throw error;
    }

    const existingMessage = await prisma.chatMessage.findFirst({
      where: {
        senderUserId: resolvedUserId,
        clientMessageId: normalizedClientMessageId,
      },
      include: messageWithSenderInclude,
    });

    if (!existingMessage) {
      throw error;
    }

    if (existingMessage.threadId !== thread.id) {
      throw new ChatServiceError(
        409,
        "clientMessageId already exists for a different thread."
      );
    }

    return {
      message: toMessageDto(existingMessage),
      wasDuplicate: true,
    };
  }
};

export const isChatServiceError = (value: unknown): value is ChatServiceError =>
  value instanceof ChatServiceError;

export const isChatStorageError = (value: unknown): boolean =>
  isChatStorageNotReadyError(value);

export { ChatServiceError };
