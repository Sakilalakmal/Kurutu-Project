import type { WorkspaceMemberRole } from "../../lib/workspace/types";
import { prisma } from "../../app/lib/prisma";

class RealtimeAuthzError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export const requireWorkspaceMember = async (workspaceId: string, userId: string) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    throw new RealtimeAuthzError("Workspace not found.", "WORKSPACE_NOT_FOUND");
  }

  return membership;
};

export const requireDiagramInWorkspace = async (workspaceId: string, diagramId: string) => {
  const diagram = await prisma.diagram.findFirst({
    where: {
      id: diagramId,
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!diagram) {
    throw new RealtimeAuthzError("Diagram not found.", "DIAGRAM_NOT_FOUND");
  }

  return diagram;
};

export const requireThreadAccess = async (threadId: string, userId: string) => {
  const thread = await prisma.chatThread.findUnique({
    where: {
      id: threadId,
    },
    select: {
      id: true,
      workspaceId: true,
      diagramId: true,
    },
  });

  if (!thread) {
    throw new RealtimeAuthzError("Thread not found.", "THREAD_NOT_FOUND");
  }

  const membership = await requireWorkspaceMember(thread.workspaceId, userId);

  return {
    thread,
    role: membership.role as WorkspaceMemberRole,
  };
};

export const requireEditableRole = (role: WorkspaceMemberRole) => {
  if (role === "VIEWER") {
    throw new RealtimeAuthzError("Forbidden", "FORBIDDEN");
  }
};

export const isRealtimeAuthzError = (value: unknown): value is RealtimeAuthzError =>
  value instanceof RealtimeAuthzError;

export { RealtimeAuthzError };
