import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { logActivity } from "@/lib/activity/logActivity";
import { createEmptyDiagramDocument } from "@/lib/diagram/defaults";
import { migrateDiagramData } from "@/lib/diagram/migrate";
import { diagramsLatestQuerySchema } from "@/lib/workspace/schemas";

const getUserIdFromSession = async () => {
  const session = await getServerSession();

  return session?.user?.id ?? null;
};

export async function GET(request: Request) {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = diagramsLatestQuerySchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
  }

  const workspaceId = parsedQuery.data.workspaceId ?? null;
  let workspaceRole: "OWNER" | "EDITOR" | "VIEWER" | null = null;

  if (workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { id: true, role: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    workspaceRole = member.role;
  }

  let diagram = await prisma.diagram.findFirst({
    where: workspaceId ? { workspaceId } : { userId, workspaceId: null },
    orderBy: { updatedAt: "desc" },
  });

  if (!diagram) {
    const emptyData = createEmptyDiagramDocument();

    diagram = await prisma.$transaction(async (tx) => {
      const created = await tx.diagram.create({
        data: {
          userId,
          workspaceId,
          title: "Untitled Diagram",
          data: emptyData,
        },
      });

      if (workspaceId) {
        await logActivity({
          tx,
          workspaceId,
          diagramId: created.id,
          actorUserId: userId,
          actionType: "DIAGRAM_CREATE",
          entityType: "DIAGRAM",
          entityId: created.id,
          summary: `created diagram "${created.title}"`,
          metadata: {
            actorRole: workspaceRole,
            diagramTitle: created.title,
          },
        });
      }

      return created;
    });
  }

  const data = migrateDiagramData(diagram.data);

  return NextResponse.json({
    diagram: {
      id: diagram.id,
      workspaceId: diagram.workspaceId,
      title: diagram.title,
      isPublic: diagram.isPublic,
      data,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    },
  });
}
