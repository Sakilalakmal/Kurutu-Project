"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader } from "@/components/chat/chat-header";
import {
  type ChatMessageListItem,
  ChatMessageList,
} from "@/components/chat/chat-message-list";
import { Card } from "@/components/ui/card";
import {
  type ChatMessage,
  type ChatThread,
  ensureDiagramChatThread,
  getChatMessages,
  getChatThreads,
} from "@/lib/chat/api";
import type { PresencePayload, PresenceUser } from "@/lib/realtime/events";
import { getRealtimeSocket } from "@/lib/realtime/socket";
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

const NEAR_BOTTOM_THRESHOLD = 80;
const SEND_TIMEOUT_MS = 8000;
const TYPING_IDLE_MS = 1500;

const createClientMessageId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

const getGeneralThreadId = (threads: ChatThread[]) =>
  threads.find((thread) => thread.type === "WORKSPACE_GENERAL")?.id ?? null;

const toMessageListItem = (message: ChatMessage): ChatMessageListItem => ({
  ...message,
  deliveryStatus: "sent",
});

const sortMessages = (messages: ChatMessageListItem[]) =>
  [...messages].sort((left, right) => {
    const timestampComparison = left.createdAt.localeCompare(right.createdAt);

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return left.id.localeCompare(right.id);
  });

const mergeRealtimeMessage = (
  existing: ChatMessageListItem[],
  incomingMessage: ChatMessage
) => {
  const incoming = toMessageListItem(incomingMessage);
  let hasMatch = false;
  const next = existing.map((message) => {
    if (message.id === incoming.id) {
      hasMatch = true;
      return incoming;
    }

    if (
      incoming.clientMessageId &&
      message.clientMessageId === incoming.clientMessageId &&
      message.senderUserId === incoming.senderUserId
    ) {
      hasMatch = true;
      return incoming;
    }

    return message;
  });

  if (!hasMatch) {
    next.push(incoming);
  }

  return sortMessages(next);
};

const formatTypingText = (names: string[]) => {
  if (names.length === 0) {
    return "";
  }

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  return `${names[0]}, ${names[1]} and others are typing...`;
};

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
  const [messages, setMessages] = useState<ChatMessageListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [viewingDiagramUsers, setViewingDiagramUsers] = useState<PresenceUser[]>([]);
  const [typingUserIdsByThread, setTypingUserIdsByThread] = useState<Record<string, string[]>>(
    {}
  );
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingThreadIdRef = useRef<string | null>(null);

  const resetThreadState = useCallback(() => {
    setThreads([]);
    setSelectedThreadId(null);
    setMessages([]);
    setNextCursor(null);
    setCurrentRole(null);
    setWorkspaceName("Workspace");
    setComposerValue("");
    setOnlineUsers([]);
    setViewingDiagramUsers([]);
    setTypingUserIdsByThread({});
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

  const updateThreadTimestamp = useCallback((threadId: string, updatedAt: string) => {
    setThreads((current) =>
      orderThreads(
        current.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                updatedAt,
              }
            : thread
        )
      )
    );
  }, []);

  const reloadMessages = useCallback(
    async (threadId: string) => {
      setIsMessagesLoading(true);
      setMessages([]);
      setNextCursor(null);

      try {
        const response = await getChatMessages({ threadId });
        const nextMessages = [...response.messages].reverse().map(toMessageListItem);

        setMessages(sortMessages(nextMessages));
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

  const stopTyping = useCallback(
    (threadIdOverride?: string | null) => {
      const threadId = threadIdOverride ?? selectedThreadId;

      if (!threadId || !isTypingRef.current) {
        return;
      }

      const socket = getRealtimeSocket();

      if (socket.connected) {
        socket.emit("chat:typingStop", { threadId });
      }

      isTypingRef.current = false;

      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
    },
    [selectedThreadId]
  );

  useEffect(() => {
    if (!isOpen) {
      stopTyping(lastTypingThreadIdRef.current);
      lastTypingThreadIdRef.current = null;
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
  }, [diagramId, diagramTitle, isOpen, resetThreadState, stopTyping, workspaceId]);

  useEffect(() => {
    if (!isOpen || !workspaceId || !selectedThreadId) {
      return;
    }

    void reloadMessages(selectedThreadId);
  }, [isOpen, reloadMessages, selectedThreadId, workspaceId]);

  useEffect(() => {
    if (!isOpen || !workspaceId) {
      return;
    }

    const socket = getRealtimeSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("auth:init", {
        workspaceId,
        diagramId: diagramId ?? undefined,
        threadId: selectedThreadId ?? undefined,
      });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handlePresenceSnapshot = (payload: PresencePayload) => {
      if (payload.workspaceId !== workspaceId) {
        return;
      }

      setOnlineUsers(payload.onlineUsers);
      setViewingDiagramUsers(payload.viewingDiagramUsers);
    };

    const handlePresenceUpdate = (payload: PresencePayload) => {
      if (payload.workspaceId !== workspaceId) {
        return;
      }

      setOnlineUsers(payload.onlineUsers);
      setViewingDiagramUsers(payload.viewingDiagramUsers);
    };

    const handleNewMessage = ({
      message,
    }: {
      message: ChatMessage;
      clientMessageId?: string;
      senderUserId: string;
    }) => {
      const container = messagesContainerRef.current;
      const shouldStickToBottom =
        !container ||
        container.scrollHeight - container.scrollTop - container.clientHeight <
          NEAR_BOTTOM_THRESHOLD;

      setMessages((current) => mergeRealtimeMessage(current, message));
      updateThreadTimestamp(message.threadId, message.createdAt);

      if (shouldStickToBottom) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    };

    const handleSentAck = ({
      clientMessageId,
      messageId,
      createdAt,
    }: {
      clientMessageId: string;
      messageId: string;
      createdAt: string;
    }) => {
      if (!currentUserId) {
        return;
      }

      setMessages((current) =>
        sortMessages(
          current.map((message) =>
            message.senderUserId === currentUserId &&
            message.clientMessageId === clientMessageId
              ? {
                  ...message,
                  id: messageId,
                  createdAt,
                  deliveryStatus: "sent",
                }
              : message
          )
        )
      );
    };

    const handleTyping = ({
      threadId,
      userId,
      isTyping,
    }: {
      threadId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      setTypingUserIdsByThread((current) => {
        const existing = current[threadId] ?? [];

        if (isTyping) {
          if (existing.includes(userId)) {
            return current;
          }

          return {
            ...current,
            [threadId]: [...existing, userId],
          };
        }

        if (!existing.includes(userId)) {
          return current;
        }

        const nextUsers = existing.filter((id) => id !== userId);

        return {
          ...current,
          [threadId]: nextUsers,
        };
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:snapshot", handlePresenceSnapshot);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("chat:newMessage", handleNewMessage);
    socket.on("chat:sentAck", handleSentAck);
    socket.on("chat:typing", handleTyping);

    if (socket.connected) {
      setSocketConnected(true);
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:snapshot", handlePresenceSnapshot);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("chat:newMessage", handleNewMessage);
      socket.off("chat:sentAck", handleSentAck);
      socket.off("chat:typing", handleTyping);
    };
  }, [
    currentUserId,
    diagramId,
    isOpen,
    scrollToBottom,
    selectedThreadId,
    updateThreadTimestamp,
    workspaceId,
  ]);

  useEffect(() => {
    if (!selectedThreadId) {
      stopTyping(lastTypingThreadIdRef.current);
      lastTypingThreadIdRef.current = null;
      return;
    }

    if (lastTypingThreadIdRef.current && lastTypingThreadIdRef.current !== selectedThreadId) {
      stopTyping(lastTypingThreadIdRef.current);
    }

    lastTypingThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId, stopTyping]);

  useEffect(() => {
    return () => {
      stopTyping(lastTypingThreadIdRef.current);
    };
  }, [stopTyping]);

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
      const older = [...response.messages].reverse().map(toMessageListItem);

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

  const markMessageAsFailed = useCallback(
    (clientMessageId: string) => {
      if (!currentUserId) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.senderUserId === currentUserId &&
          message.clientMessageId === clientMessageId &&
          message.deliveryStatus !== "sent"
            ? {
                ...message,
                deliveryStatus: "failed",
              }
            : message
        )
      );
    },
    [currentUserId]
  );

  const emitSendMessage = useCallback(
    ({
      clientMessageId,
      content,
      threadId,
    }: {
      clientMessageId: string;
      content: string;
      threadId: string;
    }) => {
      const socket = getRealtimeSocket();

      if (!socket.connected) {
        markMessageAsFailed(clientMessageId);
        toast.error("Realtime connection is unavailable.");
        return;
      }

      let isResolved = false;
      const timeoutId = window.setTimeout(() => {
        if (isResolved) {
          return;
        }

        isResolved = true;
        markMessageAsFailed(clientMessageId);
      }, SEND_TIMEOUT_MS);

      socket.emit(
        "chat:send",
        {
          threadId,
          content,
          clientMessageId,
        },
        (response) => {
          if (isResolved) {
            return;
          }

          isResolved = true;
          window.clearTimeout(timeoutId);

          if (!response.ok) {
            markMessageAsFailed(clientMessageId);

            if (response.code === "FORBIDDEN") {
              toast.error("You don't have permission to send messages.");
            } else {
              toast.error(response.error);
            }
          }
        }
      );
    },
    [markMessageAsFailed]
  );

  const handleSendMessage = useCallback(() => {
    if (!selectedThreadId || !currentUserId) {
      return;
    }

    const normalizedContent = composerValue.trim();

    if (!normalizedContent) {
      return;
    }

    stopTyping(selectedThreadId);
    setComposerValue("");

    const nowIso = new Date().toISOString();
    const clientMessageId = createClientMessageId();
    const currentUser =
      onlineUsers.find((user) => user.id === currentUserId) ??
      messages.find((message) => message.senderUserId === currentUserId)?.sender ?? {
        id: currentUserId,
        name: "You",
        image: null,
      };

    setMessages((current) =>
      sortMessages([
        ...current,
        {
          id: `optimistic:${clientMessageId}`,
          threadId: selectedThreadId,
          workspaceId: workspaceId ?? "",
          senderUserId: currentUserId,
          clientMessageId,
          content: normalizedContent,
          createdAt: nowIso,
          editedAt: null,
          deletedAt: null,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          },
          deliveryStatus: "pending",
        },
      ])
    );
    updateThreadTimestamp(selectedThreadId, nowIso);

    requestAnimationFrame(() => {
      scrollToBottom();
    });

    emitSendMessage({
      clientMessageId,
      content: normalizedContent,
      threadId: selectedThreadId,
    });
  }, [
    composerValue,
    currentUserId,
    emitSendMessage,
    messages,
    onlineUsers,
    scrollToBottom,
    selectedThreadId,
    stopTyping,
    updateThreadTimestamp,
    workspaceId,
  ]);

  const handleRetryMessage = useCallback(
    (clientMessageId: string) => {
      const failedMessage = messages.find(
        (message) => message.clientMessageId === clientMessageId
      );

      if (!failedMessage || !selectedThreadId) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.clientMessageId === clientMessageId
            ? {
                ...message,
                deliveryStatus: "pending",
              }
            : message
        )
      );

      emitSendMessage({
        clientMessageId,
        content: failedMessage.content,
        threadId: selectedThreadId,
      });
    },
    [emitSendMessage, messages, selectedThreadId]
  );

  const handleTypingActivity = useCallback(() => {
    if (!selectedThreadId || !socketConnected) {
      return;
    }

    const socket = getRealtimeSocket();

    if (!isTypingRef.current) {
      socket.emit("chat:typingStart", { threadId: selectedThreadId });
      isTypingRef.current = true;
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      stopTyping(selectedThreadId);
    }, TYPING_IDLE_MS);
  }, [selectedThreadId, socketConnected, stopTyping]);

  const isViewer = currentRole === "VIEWER";
  const canSend =
    !isViewer && Boolean(selectedThreadId) && !isThreadsLoading && socketConnected;
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

    if (!socketConnected) {
      return "Connecting realtime...";
    }

    return undefined;
  }, [isThreadsLoading, isViewer, selectedThreadId, socketConnected]);

  const userNameById = useMemo(() => {
    const lookup = new Map<string, string>();

    for (const user of onlineUsers) {
      lookup.set(user.id, user.name);
    }

    for (const message of messages) {
      lookup.set(message.senderUserId, message.sender.name);
    }

    return lookup;
  }, [messages, onlineUsers]);

  const typingUserNames = useMemo(() => {
    if (!selectedThreadId) {
      return [] as string[];
    }

    const userIds = typingUserIdsByThread[selectedThreadId] ?? [];

    return userIds
      .filter((userId) => userId !== currentUserId)
      .map((userId) => userNameById.get(userId) ?? "Someone");
  }, [currentUserId, selectedThreadId, typingUserIdsByThread, userNameById]);

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
        onlineUsers={onlineUsers}
        viewingDiagramUsers={viewingDiagramUsers}
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
        onRetryMessage={handleRetryMessage}
      />

      <p className="mt-2 min-h-4 px-1 text-xs text-zinc-500 dark:text-zinc-400">
        {formatTypingText(typingUserNames)}
      </p>

      <ChatComposer
        value={composerValue}
        onValueChange={(value) => {
          setComposerValue(value);

          if (value.trim().length === 0) {
            stopTyping(selectedThreadId);
          }
        }}
        onTypingActivity={handleTypingActivity}
        onSend={handleSendMessage}
        isSending={false}
        canSend={canSend}
        disabledReason={composerDisabledReason}
      />
    </Card>
  );
}
