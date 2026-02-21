import { NextResponse } from "next/server";
import {
  ensureDiagramThread,
  isChatServiceError,
  isChatStorageError,
} from "@/lib/chat/server";
import { createDiagramThreadSchema } from "@/lib/chat/schemas";
import { isWorkspaceAuthzError } from "@/lib/workspace/authz";

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsedPayload = createDiagramThreadSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid diagram thread payload." }, { status: 400 });
    }

    const thread = await ensureDiagramThread(
      parsedPayload.data.workspaceId,
      parsedPayload.data.diagramId
    );

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    if (isWorkspaceAuthzError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isChatServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isChatStorageError(error)) {
      return NextResponse.json(
        { error: "Chat storage is not ready. Apply the latest database migrations." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to ensure diagram thread." },
      { status: 500 }
    );
  }
}
