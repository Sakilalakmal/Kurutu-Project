import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { logActivity } from "@/lib/activity/logActivity";
import {
  isWorkspaceAuthzError,
  requireWorkspaceRole,
} from "@/lib/workspace/authz";
import {
  workspaceIdSchema,
  workspaceInviteIdSchema,
} from "@/lib/workspace/schemas";

const resolveParams = async (
  paramsInput:
    | Promise<{ workspaceId: string; inviteId: string }>
    | { workspaceId: string; inviteId: string }
) => {
  const params = await paramsInput;
  const parsedWorkspaceId = workspaceIdSchema.safeParse(params.workspaceId);
  const parsedInviteId = workspaceInviteIdSchema.safeParse(params.inviteId);

  if (!parsedWorkspaceId.success || !parsedInviteId.success) {
    throw new Error("invalid_params");
  }

  return {
    workspaceId: parsedWorkspaceId.data,
    inviteId: parsedInviteId.data,
  };
};

export async function PATCH(
  _request: Request,
  context: {
    params:
      | Promise<{ workspaceId: string; inviteId: string }>
      | { workspaceId: string; inviteId: string };
  }
) {
  try {
    const { workspaceId, inviteId } = await resolveParams(context.params);

    const actorMember = await requireWorkspaceRole(workspaceId, "OWNER");

    const invite = await prisma.workspaceInvite.findFirst({
      where: {
        id: inviteId,
        workspaceId,
      },
      select: {
        id: true,
        revokedAt: true,
        role: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    if (invite.revokedAt) {
      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await logActivity({
        tx,
        workspaceId,
        actorUserId: actorMember.userId,
        actionType: "INVITE_REVOKE",
        entityType: "INVITE",
        entityId: invite.id,
        summary: "revoked an invite link",
        metadata: {
          actorRole: actorMember.role,
          inviteRole: invite.role,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_params") {
      return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to revoke invite." }, { status: 500 });
  }
}
