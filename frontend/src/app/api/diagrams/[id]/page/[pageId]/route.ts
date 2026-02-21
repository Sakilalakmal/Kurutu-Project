import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { migrateDiagramData } from "@/lib/diagram/migrate";

const resolveParams = async (
  paramsInput: Promise<{ id: string; pageId: string }> | { id: string; pageId: string }
) => {
  const params = await paramsInput;

  return { diagramId: params.id, pageId: params.pageId };
};

export async function GET(
  _request: Request,
  context: {
    params:
      | Promise<{ id: string; pageId: string }>
      | { id: string; pageId: string };
  }
) {
  const { diagramId, pageId } = await resolveParams(context.params);
  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      title: true,
      isPublic: true,
      data: true,
    },
  });

  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  const session = await getServerSession();
  const viewerUserId = session?.user?.id ?? null;
  let isOwner = viewerUserId === diagram.userId;

  if (!diagram.isPublic && !viewerUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (diagram.workspaceId && viewerUserId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: diagram.workspaceId,
          userId: viewerUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (member) {
      isOwner = member.role === "OWNER";
    } else if (!diagram.isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!diagram.isPublic && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = migrateDiagramData(diagram.data);
  const page = data.pages.find((entry) => entry.id === pageId);

  if (!page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  return NextResponse.json({
    diagramId: diagram.id,
    title: diagram.title,
    isPublic: diagram.isPublic,
    isOwner,
    page,
  });
}
