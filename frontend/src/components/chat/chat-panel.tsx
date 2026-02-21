"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { Card } from "@/components/ui/card";
import {
  type ChatMessage,
  type ChatThread,
  ChatApiError,
  ensureDiagramChatThread,
  getChatMessages,
  getChatThreads,
  sendChatMessage,
} from "@/lib/chat/api";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberRole } from "@/lib/workspace/types";

type ChatPanelProps = {
  className?: string;
  isOpen: boolean;
  workspaceId: string | null;
  diagramId: string | null;
  diagramTitle: string;
  currentUserId: string | null;
};

const POLL_INTERVAL_MS = 5000;
const NEAR_BOTTOM_THRESHOLD = 80;

const orderThreads = (threads: ChatThread[]) => {
  const general = threads.find((thread) => thread.type === "WORKSPACE_GENERAL") ?? null;
  const diagrams = threads
    .filter((thread) => thread.type === "DIAGRAM")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return general ? [general, ...diagrams] : diagrams;
};

const upsertThread = (threads: ChatThread[], target: ChatThread) => {
  const withoutTarget = threads.filter((thread) => thread.id !== target.id);

  return orderThreads([target, ...withoutTarget]);
};

const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  if (incoming.length === 0) {
    return existing;
  }

  const byId = new Map(existing.map((message) => [message.id, message]));

  incoming.forEach((message) => {
    byId.set(message.id, message);
  });

  return Array.from(byId.values()).sort((left, right) => {
    const timestampComparison = left.createdAt.localeCompare(right.createdAt);

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return left.id.localeCompare(right.id);
  });
};

const getGeneralThreadId = (threads: ChatThread[]) =>
  threads.find((thread) => thread.type === "WORKSPACE_GENERAL")?.id ?? null;

export function ChatPanel({
  className,
  isOpen,
  workspaceId,
  diagramId,
  diagramTitle,
  currentUserId,
}: ChatPanelProps) {
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [currentRole, setCurrentRole] = useState<WorkspaceMemberRole | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const resetThreadState = useCallback(() => {
    setThreads([]);
    setSelectedThreadId(null);
    setMessages([]);
    setNextCursor(null);
    setCurrentRole(null);
    setWorkspaceName("Workspace");
    setComposerValue("");
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

  const reloadMessages = useCallback(
    async (threadId: string) => {
      setIsMessagesLoading(true);
      setMessages([]);
      setNextCursor(null);

      try {
        const response = await getChatMessages({ threadId });
        const nextMessages = [...response.messages].reverse();

        setMessages(nextMessages);
        setNextCursor(response.nextCursor);

        requestAnimationFrame(() => {
          scrollToBottom();
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load chat messages."
        );
      } finally {
        setIsMessagesLoading(false);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!workspaceId) {
      resetThreadState();
      return;
    }

    let cancelled = false;

    const loadThreads = async () => {
      setIsThreadsLoading(true);
      setCurrentRole(null);

      try {
        const result = await getChatThreads(workspaceId);

        if (cancelled) {
          return;
        }

        setWorkspaceName(result.workspace.name);
        setCurrentRole(result.currentRole);

        let nextThreads = orderThreads(result.threads);
        let defaultThreadId = getGeneralThreadId(nextThreads);

        if (diagramId) {
          const ensuredThread = await ensureDiagramChatThread({ workspaceId, diagramId });

          if (cancelled) {
            return;
          }

          nextThreads = upsertThread(nextThreads, {
            ...ensuredThread,
            title:
              ensuredThread.type === "DIAGRAM"
                ? `Diagram: ${diagramTitle.trim() || "Untitled Diagram"}`
                : ensuredThread.title,
            diagram:
              ensuredThread.type === "DIAGRAM"
                ? {
                    id: diagramId,
                    title: diagramTitle.trim() || "Untitled Diagram",
                  }
                : ensuredThread.diagram,
          });
          defaultThreadId = ensuredThread.id;
        }

        setThreads(nextThreads);
        setSelectedThreadId(defaultThreadId);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load chat threads."
          );
          resetThreadState();
        }
      } finally {
        if (!cancelled) {
          setIsThreadsLoading(false);
        }
      }
    };

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, [diagramId, diagramTitle, isOpen, resetThreadState, workspaceId]);

  useEffect(() => {
    if (!isOpen || !workspaceId || !selectedThreadId) {
      return;
    }

    void reloadMessages(selectedThreadId);
  }, [isOpen, reloadMessages, selectedThreadId, workspaceId]);

  const pollSelectedThread = useCallback(async () => {
    if (!selectedThreadId) {
      return;
    }

    const container = messagesContainerRef.current;
    const shouldStickToBottom =
      !container ||
      container.scrollHeight - container.scrollTop - container.clientHeight <
        NEAR_BOTTOM_THRESHOLD;

    try {
      const response = await getChatMessages({ threadId: selectedThreadId });
      const latestMessages = [...response.messages].reverse();

      setMessages((current) => {
        const merged = mergeMessages(current, latestMessages);

        if (shouldStickToBottom && merged.length > current.length) {
          requestAnimationFrame(() => {
            scrollToBottom();
          });
        }

        return merged;
      });
    } catch {
      // Silent on polling failures.
    }
  }, [scrollToBottom, selectedThreadId]);

  useEffect(() => {
    if (!isOpen || !workspaceId || !selectedThreadId) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollSelectedThread();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [isOpen, pollSelectedThread, selectedThreadId, workspaceId]);

  const handleLoadMore = useCallback(async () => {
    if (!selectedThreadId || !nextCursor || isLoadingMore) {
      return;
    }

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    setIsLoadingMore(true);

    try {
      const response = await getChatMessages({
        threadId: selectedThreadId,
        cursor: nextCursor,
      });
      const older = [...response.messages].reverse();

      setMessages((current) => {
        const existingIds = new Set(current.map((message) => message.id));
        const toPrepend = older.filter((message) => !existingIds.has(message.id));

        return [...toPrepend, ...current];
      });
      setNextCursor(response.nextCursor);

      requestAnimationFrame(() => {
        if (!container) {
          return;
        }

        const nextScrollHeight = container.scrollHeight;
        container.scrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load older messages."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor, selectedThreadId]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedThreadId || isSending) {
      return;
    }

    const normalizedContent = composerValue.trim();

    if (!normalizedContent) {
      return;
    }

    setIsSending(true);

    try {
      const message = await sendChatMessage({
        threadId: selectedThreadId,
        content: normalizedContent,
      });

      setMessages((current) => mergeMessages(current, [message]));
      setThreads((current) =>
        orderThreads(
          current.map((thread) =>
            thread.id === selectedThreadId
              ? {
                  ...thread,
                  updatedAt: message.createdAt,
                }
              : thread
          )
        )
      );
      setComposerValue("");

      requestAnimationFrame(() => {
        scrollToBottom();
      });
    } catch (error) {
      if (error instanceof ChatApiError && error.status === 403) {
        toast.error("You don't have permission to send messages.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to send message.");
      }
    } finally {
      setIsSending(false);
    }
  }, [composerValue, isSending, scrollToBottom, selectedThreadId]);

  const isViewer = currentRole === "VIEWER";
  const canSend = !isViewer && Boolean(selectedThreadId) && !isThreadsLoading;
  const composerDisabledReason = useMemo(() => {
    if (isViewer) {
      return "Viewers can't send messages";
    }

    if (isThreadsLoading) {
      return "Loading threads";
    }

    if (!selectedThreadId) {
      return "Select a thread to start chatting";
    }

    return undefined;
  }, [isThreadsLoading, isViewer, selectedThreadId]);

  if (!workspaceId) {
    return (
      <Card
        className={cn(
          "flex h-full min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border-zinc-200/80 bg-white/90 p-6 text-center shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur",
          "dark:border-zinc-800 dark:bg-zinc-950/90",
          className
        )}
      >
        <MessageSquare className="mb-3 size-6 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Workspace chat only
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Select a workspace to use chat.
        </p>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "flex h-full min-h-[420px] w-full flex-col rounded-2xl border-zinc-200/80 bg-white/90 p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur",
        "dark:border-zinc-800 dark:bg-zinc-950/90",
        className
      )}
    >
      <ChatHeader
        workspaceName={workspaceName}
        threads={threads}
        selectedThreadId={selectedThreadId}
        onThreadChange={setSelectedThreadId}
        disabled={isThreadsLoading}
      />

      <div className="my-3 h-px bg-zinc-200 dark:bg-zinc-800" />

      <ChatMessageList
        containerRef={messagesContainerRef}
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isMessagesLoading || isThreadsLoading}
        isLoadingMore={isLoadingMore}
        hasMore={nextCursor !== null}
        onLoadMore={() => {
          void handleLoadMore();
        }}
      />

      <ChatComposer
        value={composerValue}
        onValueChange={setComposerValue}
        onSend={() => {
          void handleSendMessage();
        }}
        isSending={isSending}
        canSend={canSend}
        disabledReason={composerDisabledReason}
      />
    </Card>
  );
}
