import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { logActivity } from "@/lib/activity/logActivity";
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

    const actorMember = await requireWorkspaceRole(workspaceId, "OWNER");

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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    const shouldLogRoleChange = targetMember.role !== parsedPayload.data.role;
    const updated = await prisma.$transaction(async (tx) => {
      const nextMember = await tx.workspaceMember.update({
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

      if (shouldLogRoleChange) {
        await logActivity({
          tx,
          workspaceId,
          actorUserId: actorMember.userId,
          actionType: "MEMBER_ROLE_CHANGE",
          entityType: "MEMBER",
          entityId: targetMember.id,
          summary: `changed ${targetMember.user.name}'s role from ${targetMember.role} to ${parsedPayload.data.role}`,
          metadata: {
            actorRole: actorMember.role,
            targetUserId: targetMember.userId,
            targetMemberId: targetMember.id,
            previousRole: targetMember.role,
            nextRole: parsedPayload.data.role,
          },
        });
      }

      return nextMember;
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

    const actorMember = await requireWorkspaceRole(workspaceId, "OWNER", userId);

    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    await assertOwnerCountSafety({
      workspaceId,
      targetRole: targetMember.role,
    });

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({
        where: {
          id: targetMember.id,
        },
      });

      await logActivity({
        tx,
        workspaceId,
        actorUserId: actorMember.userId,
        actionType: "MEMBER_REMOVE",
        entityType: "MEMBER",
        entityId: targetMember.id,
        summary: `removed ${targetMember.user.name} from the workspace`,
        metadata: {
          actorRole: actorMember.role,
          targetUserId: targetMember.userId,
          targetMemberId: targetMember.id,
          removedRole: targetMember.role,
        },
      });
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
