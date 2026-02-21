import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getInviteValidationError } from "@/lib/workspace/invite";
import { workspaceInviteTokenSchema } from "@/lib/workspace/schemas";

const resolveToken = async (
  paramsInput: Promise<{ token: string }> | { token: string }
) => {
  const params = await paramsInput;
  const parsedToken = workspaceInviteTokenSchema.safeParse(params.token);

  if (!parsedToken.success) {
    throw new Error("invalid_token");
  }

  return parsedToken.data;
};

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ token: string }> | { token: string };
  }
) {
  try {
    const token = await resolveToken(context.params);

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const validationError = getInviteValidationError(invite);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspace.name,
        role: invite.role,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usesCount: invite.usesCount,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_token") {
      return NextResponse.json({ error: "Invalid invite token." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to load invite." }, { status: 500 });
  }
}