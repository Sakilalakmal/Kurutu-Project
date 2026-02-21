import { getServerSession } from "../../app/lib/auth";
import { prisma } from "../../app/lib/prisma";
import type { WorkspaceMemberRole } from "./types";

const workspaceRoleRank: Record<WorkspaceMemberRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

class WorkspaceAuthzError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const resolveUserId = async (userId?: string) => {
  if (userId) {
    return userId;
  }

  const session = await getServerSession();
  const sessionUserId = session?.user?.id ?? null;

  if (!sessionUserId) {
    throw new WorkspaceAuthzError(401, "Unauthorized");
  }

  return sessionUserId;
};

export const requireUser = async () => {
  const userId = await resolveUserId();

  return { userId };
};

export const requireWorkspaceMember = async (
  workspaceId: string,
  userId?: string
) => {
  const resolvedUserId = await resolveUserId(userId);

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: resolvedUserId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          createdByUserId: true,
        },
      },
    },
  });

  if (!member) {
    throw new WorkspaceAuthzError(404, "Workspace not found.");
  }

  return member;
};

export const hasWorkspaceRoleAtLeast = (
  currentRole: WorkspaceMemberRole,
  requiredRole: WorkspaceMemberRole
) => workspaceRoleRank[currentRole] >= workspaceRoleRank[requiredRole];

export const requireWorkspaceRole = async (
  workspaceId: string,
  requiredRole: WorkspaceMemberRole,
  userId?: string
) => {
  const member = await requireWorkspaceMember(workspaceId, userId);

  if (!hasWorkspaceRoleAtLeast(member.role, requiredRole)) {
    throw new WorkspaceAuthzError(403, "Forbidden");
  }

  return member;
};

export const getMyWorkspaces = async (userId?: string) => {
  const resolvedUserId = await resolveUserId(userId);

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: resolvedUserId,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      workspace: {
        updatedAt: "desc",
      },
    },
  });

  return memberships;
};

export const isWorkspaceAuthzError = (
  value: unknown
): value is WorkspaceAuthzError => value instanceof WorkspaceAuthzError;

export { WorkspaceAuthzError };
