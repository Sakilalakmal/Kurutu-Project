import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { logActivity } from "@/lib/activity/logActivity";
import {
  isWorkspaceAuthzError,
  requireUser,
} from "@/lib/workspace/authz";
import { getInviteValidationError } from "@/lib/workspace/invite";
import { workspaceInviteTokenSchema } from "@/lib/workspace/schemas";

class JoinInviteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const resolveToken = async (
  paramsInput: Promise<{ token: string }> | { token: string }
) => {
  const params = await paramsInput;
  const parsedToken = workspaceInviteTokenSchema.safeParse(params.token);

  if (!parsedToken.success) {
    throw new JoinInviteError(400, "Invalid invite token.");
  }

  return parsedToken.data;
};

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ token: string }> | { token: string };
  }
) {
  try {
    const { userId } = await requireUser();
    const token = await resolveToken(context.params);

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const invite = await tx.workspaceInvite.findUnique({
        where: { token },
        select: {
          id: true,
          workspaceId: true,
          role: true,
          revokedAt: true,
          expiresAt: true,
          maxUses: true,
          usesCount: true,
        },
      });

      if (!invite) {
        throw new JoinInviteError(404, "Invite not found.");
      }

      const validationError = getInviteValidationError(invite, now);

      if (validationError) {
        throw new JoinInviteError(400, validationError);
      }

      const existingMember = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId,
          },
        },
        select: {
          role: true,
        },
      });

      if (existingMember) {
        return {
          workspaceId: invite.workspaceId,
          alreadyMember: true,
          role: existingMember.role,
        };
      }

      const memberRole = invite.role === "EDITOR" ? "EDITOR" : "VIEWER";

      try {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId,
            role: memberRole,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const joinedMember = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId,
            },
          },
          select: {
            role: true,
          },
        });

        return {
          workspaceId: invite.workspaceId,
          alreadyMember: true,
          role: joinedMember?.role ?? memberRole,
        };
      }

      const updatedInviteCount = await tx.workspaceInvite.updateMany({
        where: {
          id: invite.id,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          ...(invite.maxUses !== null ? { usesCount: { lt: invite.maxUses } } : {}),
        },
        data: {
          usesCount: {
            increment: 1,
          },
        },
      });

      if (updatedInviteCount.count !== 1) {
        throw new JoinInviteError(400, "This invite is no longer active.");
      }

      await logActivity({
        tx,
        workspaceId: invite.workspaceId,
        actorUserId: userId,
        actionType: "MEMBER_JOIN",
        entityType: "MEMBER",
        entityId: userId,
        summary: `joined the workspace as ${memberRole.toLowerCase()}`,
        metadata: {
          actorRole: memberRole,
          inviteRole: invite.role,
        },
      });

      return {
        workspaceId: invite.workspaceId,
        alreadyMember: false,
        role: memberRole,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JoinInviteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to join workspace." }, { status: 500 });
  }
}
