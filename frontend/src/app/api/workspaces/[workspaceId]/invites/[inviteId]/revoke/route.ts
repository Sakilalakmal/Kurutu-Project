import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
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

    await requireWorkspaceRole(workspaceId, "OWNER");

    const invite = await prisma.workspaceInvite.findFirst({
      where: {
        id: inviteId,
        workspaceId,
      },
      select: {
        id: true,
        revokedAt: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    if (invite.revokedAt) {
      return NextResponse.json({ success: true });
    }

    await prisma.workspaceInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        revokedAt: new Date(),
      },
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