import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const sharePayloadSchema = z.object({
  isPublic: z.boolean(),
});

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

export async function PATCH(
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

  const parsedPayload = sharePayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid share payload." }, { status: 400 });
  }

  const diagram = await prisma.diagram.findUnique({
    where: { id: diagramId },
    select: { id: true, userId: true },
  });

  if (!diagram || diagram.userId !== userId) {
    return NextResponse.json({ error: "Diagram not found." }, { status: 404 });
  }

  const updatedDiagram = await prisma.diagram.update({
    where: { id: diagramId },
    data: { isPublic: parsedPayload.data.isPublic },
    select: {
      id: true,
      title: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    diagram: updatedDiagram,
  });
}
