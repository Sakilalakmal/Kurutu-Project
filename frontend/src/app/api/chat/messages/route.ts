import { NextResponse } from "next/server";
import {
  createMessage,
  isChatServiceError,
  isChatStorageError,
  listMessagesPage,
} from "@/lib/chat/server";
import {
  getMessagesQuerySchema,
  postMessageSchema,
} from "@/lib/chat/schemas";
import { isWorkspaceAuthzError } from "@/lib/workspace/authz";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = getMessagesQuerySchema.safeParse({
      threadId: url.searchParams.get("threadId") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const result = await listMessagesPage(
      parsedQuery.data.threadId,
      parsedQuery.data.cursor
    );

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

    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsedPayload = postMessageSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const message = await createMessage(
      parsedPayload.data.threadId,
      parsedPayload.data.content
    );

    return NextResponse.json({ message }, { status: 201 });
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

    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
