import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { logActivity } from "@/lib/activity/logActivity";
import {
  isWorkspaceAuthzError,
  requireUser,
  requireWorkspaceMember,
} from "@/lib/workspace/authz";
import { workspaceIdSchema } from "@/lib/workspace/schemas";

const resolveWorkspaceId = async (
  paramsInput: Promise<{ workspaceId: string }> | { workspaceId: string }
) => {
  const params = await paramsInput;
  const parsedWorkspaceId = workspaceIdSchema.safeParse(params.workspaceId);

  if (!parsedWorkspaceId.success) {
    throw new Error("invalid_workspace_id");
  }

  return parsedWorkspaceId.data;
};

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ workspaceId: string }> | { workspaceId: string };
  }
) {
  try {
    const workspaceId = await resolveWorkspaceId(context.params);
    const { userId } = await requireUser();
    const member = await requireWorkspaceMember(workspaceId, userId);

    if (member.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Workspace must have at least one owner." },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({
        where: {
          id: member.id,
        },
      });

      await logActivity({
        tx,
        workspaceId,
        actorUserId: userId,
        actionType: "MEMBER_REMOVE",
        entityType: "MEMBER",
        entityId: member.id,
        summary: "left the workspace",
        metadata: {
          selfRemoved: true,
          removedRole: member.role,
          targetMemberId: member.id,
          targetUserId: member.userId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_workspace_id") {
      return NextResponse.json({ error: "Invalid workspace id." }, { status: 400 });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to leave workspace." }, { status: 500 });
  }
}
