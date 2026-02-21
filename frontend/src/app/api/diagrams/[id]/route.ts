import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { migrateDiagramData } from "@/lib/diagram/migrate";
import { updateDiagramPayloadSchema } from "@/lib/diagram/types";

const getUserIdFromSession = async () => {
  const session = await getServerSession();

  return session?.user?.id ?? null;
};

const resolveParams = async (
  paramsInput: Promise<{ id: string }> | { id: string }
) => {
  const params = await paramsInput;

  return params.id;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagramId = await resolveParams(context.params);
  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
  });

  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  if (diagram.workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: diagram.workspaceId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
    }
  } else if (diagram.userId !== userId) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  return NextResponse.json({
    diagram: {
      id: diagram.id,
      workspaceId: diagram.workspaceId,
      title: diagram.title,
      isPublic: diagram.isPublic,
      data: migrateDiagramData(diagram.data),
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    },
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagramId = await resolveParams(context.params);

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedPayload = updateDiagramPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid diagram payload." }, { status: 400 });
  }

  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { id: true, userId: true, workspaceId: true },
  });

  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  if (diagram.workspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: diagram.workspaceId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
    }

    if (member.role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (diagram.userId !== userId) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  const updatedDiagram = await prisma.diagram.update({
    where: { id: diagramId },
    data: {
      title: parsedPayload.data.title,
      data: parsedPayload.data.data,
    },
  });

  return NextResponse.json({
    diagram: {
      id: updatedDiagram.id,
      workspaceId: updatedDiagram.workspaceId,
      title: updatedDiagram.title,
      isPublic: updatedDiagram.isPublic,
      data: parsedPayload.data.data,
      createdAt: updatedDiagram.createdAt,
      updatedAt: updatedDiagram.updatedAt,
    },
  });
}
