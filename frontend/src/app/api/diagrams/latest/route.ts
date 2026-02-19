import { NextResponse } from "next/server";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createEmptyDiagramDocument } from "@/lib/diagram/defaults";
import { migrateDiagramData } from "@/lib/diagram/migrate";

const getUserIdFromSession = async () => {
  const session = await getServerSession();

  return session?.user?.id ?? null;
};

export async function GET() {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let diagram = await prisma.diagram.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!diagram) {
    const emptyData = createEmptyDiagramDocument();

    diagram = await prisma.diagram.create({
      data: {
        userId,
        title: "Untitled Diagram",
        data: emptyData,
      },
    });
  }

  const data = migrateDiagramData(diagram.data);

  return NextResponse.json({
    diagram: {
      id: diagram.id,
      title: diagram.title,
      isPublic: diagram.isPublic,
      data,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt,
    },
  });
}
