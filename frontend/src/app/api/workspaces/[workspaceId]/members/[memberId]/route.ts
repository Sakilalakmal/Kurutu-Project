import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  isWorkspaceAuthzError,
  requireUser,
  requireWorkspaceRole,
} from "@/lib/workspace/authz";
import {
  updateWorkspaceMemberRoleSchema,
  workspaceIdSchema,
  workspaceMemberIdSchema,
} from "@/lib/workspace/schemas";

const resolveParams = async (
  paramsInput:
    | Promise<{ workspaceId: string; memberId: string }>
    | { workspaceId: string; memberId: string }
) => {
  const params = await paramsInput;
  const parsedWorkspaceId = workspaceIdSchema.safeParse(params.workspaceId);
  const parsedMemberId = workspaceMemberIdSchema.safeParse(params.memberId);

  if (!parsedWorkspaceId.success || !parsedMemberId.success) {
    throw new Error("invalid_params");
  }

  return {
    workspaceId: parsedWorkspaceId.data,
    memberId: parsedMemberId.data,
  };
};

const assertOwnerCountSafety = async ({
  workspaceId,
  targetRole,
  nextRole,
}: {
  workspaceId: string;
  targetRole: "OWNER" | "EDITOR" | "VIEWER";
  nextRole?: "OWNER" | "EDITOR" | "VIEWER";
}) => {
  const isOwnerDowngrade = targetRole === "OWNER" && nextRole !== "OWNER";

  if (!isOwnerDowngrade) {
    return;
  }

  const ownerCount = await prisma.workspaceMember.count({
    where: {
      workspaceId,
      role: "OWNER",
    },
  });

  if (ownerCount <= 1) {
    throw new Error("last_owner");
  }
};

export async function PATCH(
  request: Request,
  context: {
    params:
      | Promise<{ workspaceId: string; memberId: string }>
      | { workspaceId: string; memberId: string };
  }
) {
  try {
    const { workspaceId, memberId } = await resolveParams(context.params);

    await requireWorkspaceRole(workspaceId, "OWNER");

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsedPayload = updateWorkspaceMemberRoleSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid member role payload." }, { status: 400 });
    }

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    await assertOwnerCountSafety({
      workspaceId,
      targetRole: targetMember.role,
      nextRole: parsedPayload.data.role,
    });

    const updated = await prisma.workspaceMember.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role: parsedPayload.data.role,
      },
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
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_params") {
      return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "last_owner") {
      return NextResponse.json(
        { error: "Workspace must have at least one owner." },
        { status: 400 }
      );
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to update member role." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params:
      | Promise<{ workspaceId: string; memberId: string }>
      | { workspaceId: string; memberId: string };
  }
) {
  try {
    const { workspaceId, memberId } = await resolveParams(context.params);
    const { userId } = await requireUser();

    await requireWorkspaceRole(workspaceId, "OWNER", userId);

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    await assertOwnerCountSafety({
      workspaceId,
      targetRole: targetMember.role,
    });

    await prisma.workspaceMember.delete({
      where: {
        id: targetMember.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_params") {
      return NextResponse.json({ error: "Invalid request parameters." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "last_owner") {
      return NextResponse.json(
        { error: "Workspace must have at least one owner." },
        { status: 400 }
      );
    }

    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to remove member." }, { status: 500 });
  }
}