import { NextResponse } from "next/server";
import {
  isChatServiceError,
  isChatStorageError,
  listWorkspaceThreads,
} from "@/lib/chat/server";
import { getThreadsQuerySchema } from "@/lib/chat/schemas";
import { isWorkspaceAuthzError } from "@/lib/workspace/authz";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = getThreadsQuerySchema.safeParse({
      workspaceId: url.searchParams.get("workspaceId") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const result = await listWorkspaceThreads(parsedQuery.data.workspaceId);

    return NextResponse.json(result);
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

    return NextResponse.json({ error: "Failed to load chat threads." }, { status: 500 });
  }
}
