import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
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

  if (workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
  }

  let diagram = await prisma.diagram.findFirst({
    where: workspaceId ? { workspaceId } : { userId, workspaceId: null },
    orderBy: { updatedAt: "desc" },
  });

  if (!diagram) {
    const emptyData = createEmptyDiagramDocument();

    diagram = await prisma.diagram.create({
      data: {
        userId,
        workspaceId,
        title: "Untitled Diagram",
        data: emptyData,
      },
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
