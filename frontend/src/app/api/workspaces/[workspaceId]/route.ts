import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  isWorkspaceAuthzError,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from "@/lib/workspace/authz";
import { updateWorkspaceSchema, workspaceIdSchema } from "@/lib/workspace/schemas";
import { isWorkspaceManagerRole } from "@/lib/workspace/types";

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

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ workspaceId: string }> | { workspaceId: string };
  }
) {
  try {
    const workspaceId = await resolveWorkspaceId(context.params);
    const member = await requireWorkspaceMember(workspaceId);

    const includeMembers = isWorkspaceManagerRole(member.role);

    const [members, invites] = await Promise.all([
      includeMembers
        ? prisma.workspaceMember.findMany({
            where: { workspaceId },
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      member.role === "OWNER"
        ? prisma.workspaceInvite.findMany({
            where: {
              workspaceId,
              revokedAt: null,
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      workspace: {
        id: member.workspace.id,
        name: member.workspace.name,
        slug: member.workspace.slug,
        createdAt: member.workspace.createdAt,
        updatedAt: member.workspace.updatedAt,
        createdByUserId: member.workspace.createdByUserId,
        currentRole: member.role,
      },
      members,
      invites,
      permissions: {
        canViewMembers: includeMembers,
        canManageWorkspace: member.role === "OWNER",
        canManageInvites: member.role === "OWNER",
        canManageMembers: member.role === "OWNER",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_workspace_id") {
      return NextResponse.json({ error: "Invalid workspace id." }, { status: 400 });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load workspace." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ workspaceId: string }> | { workspaceId: string };
  }
) {
  try {
    const workspaceId = await resolveWorkspaceId(context.params);
    await requireWorkspaceRole(workspaceId, "OWNER");

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = updateWorkspaceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid workspace payload." }, { status: 400 });
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: parsed.data.name,
      },
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_workspace_id") {
      return NextResponse.json({ error: "Invalid workspace id." }, { status: 400 });
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to update workspace." }, { status: 500 });
  }
}