import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  getMyWorkspaces,
  isWorkspaceAuthzError,
  requireUser,
} from "@/lib/workspace/authz";
import { createWorkspaceSchema } from "@/lib/workspace/schemas";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const memberships = await getMyWorkspaces(userId);

    return NextResponse.json({
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        createdAt: membership.workspace.createdAt,
        updatedAt: membership.workspace.updatedAt,
        role: membership.role,
      })),
    });
  } catch (error) {
    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to list workspaces." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = createWorkspaceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid workspace payload." }, { status: 400 });
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          createdByUserId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: createdWorkspace.id,
          userId,
          role: "OWNER",
        },
      });

      return createdWorkspace;
    });

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          role: "OWNER",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create workspace." }, { status: 500 });
  }
}