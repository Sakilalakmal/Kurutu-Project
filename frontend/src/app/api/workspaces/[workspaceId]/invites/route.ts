import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  isWorkspaceAuthzError,
  requireUser,
  requireWorkspaceRole,
} from "@/lib/workspace/authz";
import {
  createWorkspaceInviteSchema,
  workspaceIdSchema,
} from "@/lib/workspace/schemas";
import {
  createWorkspaceInviteToken,
  resolveInviteExpiryDate,
} from "@/lib/workspace/invite";

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
  request: Request,
  context: {
    params: Promise<{ workspaceId: string }> | { workspaceId: string };
  }
) {
  try {
    const workspaceId = await resolveWorkspaceId(context.params);
    const { userId } = await requireUser();

    await requireWorkspaceRole(workspaceId, "OWNER", userId);

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsedPayload = createWorkspaceInviteSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid invite payload." }, { status: 400 });
    }

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        role: parsedPayload.data.role,
        token: createWorkspaceInviteToken(),
        expiresAt: resolveInviteExpiryDate(parsedPayload.data.expiry),
        maxUses: parsedPayload.data.maxUses ?? null,
      },
    });

    const origin = new URL(request.url).origin;

    return NextResponse.json(
      {
        invite,
        inviteUrl: `${origin}/invite/${invite.token}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_workspace_id") {
      return NextResponse.json({ error: "Invalid workspace id." }, { status: 400 });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create invite." }, { status: 500 });
  }
}