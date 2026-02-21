"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
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
import type {
  ChatMessage,
  ChatThread,
  ChatThreadsResponse,
} from "@/lib/chat/api";
import type { PresencePayload, PresenceUser } from "@/lib/realtime/events";
import { keys } from "@/lib/query/keys";
import {
  ensureDiagramThread,
  fetchChatMessagesPage,
  fetchChatThreads,
  postChatMessage,
} from "@/lib/query/chat";
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

type ChatMessagesPage = {
  messages: ChatMessageListItem[];
  nextCursor: string | null;
};

type ChatMessagesInfiniteData = InfiniteData<ChatMessagesPage, string | undefined>;

type SendMessageVariables = {
  threadId: string;
  content: string;
  clientMessageId: string;
};

const NEAR_BOTTOM_THRESHOLD = 80;
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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const createEmptyMessagesData = (): ChatMessagesInfiniteData => ({
  pages: [
    {
      messages: [],
      nextCursor: null,
    },
  ],
  pageParams: [undefined],
});

export function ChatPanel({
  className,
  isOpen,
  workspaceId,
  diagramId,
  diagramTitle,
  currentUserId,
}: ChatPanelProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [viewingDiagramUsers, setViewingDiagramUsers] = useState<PresenceUser[]>([]);
  const [typingUserIdsByThread, setTypingUserIdsByThread] = useState<Record<string, string[]>>(
    {}
  );
  const queryClient = useQueryClient();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingThreadIdRef = useRef<string | null>(null);
  const selectedThreadIdRef = useRef<string | null>(null);
  const lastWorkspaceIdRef = useRef<string | null>(null);
  const hasManualThreadSelectionRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const hasAutoScrolledForThreadRef = useRef(false);

  const threadsQuery = useQuery({
    queryKey: keys.chatThreads(workspaceId ?? ""),
    queryFn: () => fetchChatThreads(workspaceId as string),
    enabled: isOpen && Boolean(workspaceId),
    refetchInterval: isOpen ? 10_000 : false,
    placeholderData: keepPreviousData,
  });

  const diagramThreadQuery = useQuery({
    queryKey: ["chat", "threads", "diagram", workspaceId ?? "", diagramId ?? ""],
    queryFn: () => ensureDiagramThread(workspaceId as string, diagramId as string),
    enabled: isOpen && Boolean(workspaceId) && Boolean(diagramId),
  });

  const activeThreadsData = useMemo(() => {
    if (!workspaceId || !threadsQuery.data) {
      return null;
    }

    return threadsQuery.data.workspace.id === workspaceId ? threadsQuery.data : null;
  }, [threadsQuery.data, workspaceId]);

  const threads = useMemo(() => {
    let nextThreads = orderThreads(activeThreadsData?.threads ?? []);

    if (diagramThreadQuery.data) {
      nextThreads = upsertThread(nextThreads, diagramThreadQuery.data);
    }

    if (!diagramId) {
      return nextThreads;
    }

    const normalizedTitle = diagramTitle.trim() || "Untitled Diagram";

    return nextThreads.map((thread) =>
      thread.type === "DIAGRAM" && thread.diagramId === diagramId
        ? {
            ...thread,
            title: `Diagram: ${normalizedTitle}`,
            diagram: {
              id: diagramId,
              title: normalizedTitle,
            },
          }
        : thread
    );
  }, [activeThreadsData?.threads, diagramId, diagramThreadQuery.data, diagramTitle]);

  const messagesQuery = useInfiniteQuery({
    queryKey: keys.chatMessages(selectedThreadId ?? ""),
    queryFn: async ({ pageParam }) => {
      const response = await fetchChatMessagesPage(selectedThreadId as string, pageParam);

      return {
        messages: sortMessages([...response.messages].reverse().map(toMessageListItem)),
        nextCursor: response.nextCursor,
      };
    },
    enabled: isOpen && Boolean(selectedThreadId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: isOpen && Boolean(selectedThreadId) ? 4_000 : false,
  });

  const messages = useMemo(() => {
    if (!messagesQuery.data) {
      return [] as ChatMessageListItem[];
    }

    const byId = new Map<string, ChatMessageListItem>();

    for (const page of [...messagesQuery.data.pages].reverse()) {
      for (const message of page.messages) {
        byId.set(message.id, message);
      }
    }

    return sortMessages(Array.from(byId.values()));
  }, [messagesQuery.data]);

  const workspaceName = activeThreadsData?.workspace.name ?? "Workspace";
  const currentRole: WorkspaceMemberRole | null = activeThreadsData?.currentRole ?? null;
  const isThreadsLoading = threadsQuery.isLoading && !activeThreadsData;
  const isMessagesLoading = messagesQuery.isLoading && !messagesQuery.data;
  const hasMore = Boolean(messagesQuery.hasNextPage);
  const isLoadingMore = messagesQuery.isFetchingNextPage;

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, []);

  const stopTyping = useCallback((threadIdOverride?: string | null) => {
    const threadId = threadIdOverride ?? selectedThreadIdRef.current;

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
  }, []);

  const updateThreadTimestamp = useCallback(
    (threadId: string, updatedAt: string) => {
      if (!workspaceId) {
        return;
      }

      queryClient.setQueryData<ChatThreadsResponse>(
        keys.chatThreads(workspaceId),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            threads: orderThreads(
              current.threads.map((thread) =>
                thread.id === threadId
                  ? {
                      ...thread,
                      updatedAt,
                    }
                  : thread
              )
            ),
          };
        }
      );
    },
    [queryClient, workspaceId]
  );

  const sendMessageMutation = useMutation<ChatMessage, unknown, SendMessageVariables>({
    mutationFn: ({ threadId, content, clientMessageId }) =>
      postChatMessage({ threadId, content, clientMessageId }),
    onMutate: async ({ threadId, content, clientMessageId }) => {
      if (!currentUserId) {
        return;
      }

      const queryKey = keys.chatMessages(threadId);

      await queryClient.cancelQueries({ queryKey });

      const nowIso = new Date().toISOString();
      const currentUser =
        onlineUsers.find((user) => user.id === currentUserId) ??
        messages.find((message) => message.senderUserId === currentUserId)?.sender ?? {
          id: currentUserId,
          name: "You",
          image: null,
        };

      queryClient.setQueryData<ChatMessagesInfiniteData>(queryKey, (current) => {
        const base = current ?? createEmptyMessagesData();
        const nextPages =
          base.pages.length > 0
            ? [...base.pages]
            : createEmptyMessagesData().pages;
        let hasMatch = false;

        const normalizedPages = nextPages.map((page) => ({
          ...page,
          messages: sortMessages(
            page.messages.map((message) => {
              if (
                message.senderUserId === currentUserId &&
                message.clientMessageId === clientMessageId
              ) {
                hasMatch = true;

                return {
                  ...message,
                  content,
                  deliveryStatus: "pending" as const,
                };
              }

              return message;
            })
          ),
        }));

        if (!hasMatch) {
          normalizedPages[0] = {
            ...normalizedPages[0],
            messages: sortMessages([
              ...normalizedPages[0].messages,
              {
                id: `local:${clientMessageId}`,
                threadId,
                workspaceId: workspaceId ?? "",
                senderUserId: currentUserId,
                clientMessageId,
                content,
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
            ]),
          };
        }

        return {
          ...base,
          pages: normalizedPages,
          pageParams:
            base.pageParams.length > 0
              ? base.pageParams
              : createEmptyMessagesData().pageParams,
        };
      });

      updateThreadTimestamp(threadId, nowIso);
    },
    onSuccess: (message, variables) => {
      const queryKey = keys.chatMessages(variables.threadId);
      const sentMessage = toMessageListItem(message);
      let didReplace = false;

      queryClient.setQueryData<ChatMessagesInfiniteData>(queryKey, (current) => {
        const base = current ?? createEmptyMessagesData();
        const nextPages = base.pages.map((page) => ({
          ...page,
          messages: sortMessages(
            page.messages.map((entry) => {
              if (
                entry.id === sentMessage.id ||
                (sentMessage.clientMessageId &&
                  entry.clientMessageId === sentMessage.clientMessageId &&
                  entry.senderUserId === sentMessage.senderUserId)
              ) {
                didReplace = true;
                return sentMessage;
              }

              return entry;
            })
          ),
        }));

        if (!didReplace) {
          nextPages[0] = {
            ...nextPages[0],
            messages: sortMessages([...nextPages[0].messages, sentMessage]),
          };
        }

        return {
          ...base,
          pages: nextPages,
        };
      });

      updateThreadTimestamp(message.threadId, message.createdAt);
    },
    onError: (error, variables) => {
      if (!currentUserId) {
        return;
      }

      queryClient.setQueryData<ChatMessagesInfiniteData>(
        keys.chatMessages(variables.threadId),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              messages: page.messages.map((message) =>
                message.senderUserId === currentUserId &&
                message.clientMessageId === variables.clientMessageId &&
                message.deliveryStatus !== "sent"
                  ? {
                      ...message,
                      deliveryStatus: "failed",
                    }
                  : message
              ),
            })),
          };
        }
      );

      toast.error(getErrorMessage(error, "Failed to send message."));
    },
  });

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (!workspaceId) {
      hasManualThreadSelectionRef.current = false;
      lastWorkspaceIdRef.current = null;
      return;
    }

    const isWorkspaceChanged = lastWorkspaceIdRef.current !== workspaceId;

    if (isWorkspaceChanged) {
      hasManualThreadSelectionRef.current = false;
    }

    setSelectedThreadId((current) => {
      const hasCurrentSelection =
        Boolean(current) && threads.some((thread) => thread.id === current);

      if (
        !isWorkspaceChanged &&
        hasManualThreadSelectionRef.current &&
        hasCurrentSelection
      ) {
        return current;
      }

      if (hasCurrentSelection) {
        return current;
      }

      if (diagramId) {
        const diagramThread = threads.find(
          (thread) => thread.type === "DIAGRAM" && thread.diagramId === diagramId
        );

        if (diagramThread) {
          return diagramThread.id;
        }
      }

      const generalThreadId = getGeneralThreadId(threads);

      if (generalThreadId) {
        return generalThreadId;
      }

      return threads[0]?.id ?? null;
    });

    lastWorkspaceIdRef.current = workspaceId;
  }, [diagramId, threads, workspaceId]);

  useEffect(() => {
    if (!isOpen) {
      stopTyping(lastTypingThreadIdRef.current);
      lastTypingThreadIdRef.current = null;
      return;
    }

    hasAutoScrolledForThreadRef.current = false;
  }, [isOpen, stopTyping]);

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
    hasAutoScrolledForThreadRef.current = false;
    previousMessageCountRef.current = 0;
  }, [selectedThreadId, stopTyping]);

  useEffect(() => {
    if (!threadsQuery.error) {
      return;
    }

    toast.error(getErrorMessage(threadsQuery.error, "Failed to load chat threads."));
  }, [threadsQuery.error]);

  useEffect(() => {
    if (!diagramThreadQuery.error) {
      return;
    }

    toast.error(
      getErrorMessage(diagramThreadQuery.error, "Failed to ensure diagram chat thread.")
    );
  }, [diagramThreadQuery.error]);

  useEffect(() => {
    if (!messagesQuery.error) {
      return;
    }

    toast.error(getErrorMessage(messagesQuery.error, "Failed to load chat messages."));
  }, [messagesQuery.error]);

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
    socket.on("chat:typing", handleTyping);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:snapshot", handlePresenceSnapshot);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("chat:typing", handleTyping);
    };
  }, [diagramId, isOpen, selectedThreadId, workspaceId]);

  useEffect(() => {
    if (!isOpen || !selectedThreadId || hasAutoScrolledForThreadRef.current) {
      return;
    }

    if (!messagesQuery.isFetched) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToBottom();
      hasAutoScrolledForThreadRef.current = true;
      previousMessageCountRef.current = messages.length;
    });
  }, [isOpen, messages.length, messagesQuery.isFetched, scrollToBottom, selectedThreadId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const previousCount = previousMessageCountRef.current;
    const nextCount = messages.length;

    if (!container) {
      previousMessageCountRef.current = nextCount;
      return;
    }

    if (nextCount > previousCount) {
      const shouldStickToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        NEAR_BOTTOM_THRESHOLD;

      if (shouldStickToBottom) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    }

    previousMessageCountRef.current = nextCount;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      stopTyping(lastTypingThreadIdRef.current);
    };
  }, [stopTyping]);

  const handleLoadMore = useCallback(async () => {
    if (!selectedThreadId || !hasMore || isLoadingMore) {
      return;
    }

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    try {
      await messagesQuery.fetchNextPage();

      requestAnimationFrame(() => {
        if (!container) {
          return;
        }

        const nextScrollHeight = container.scrollHeight;
        container.scrollTop = nextScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load older messages."));
    }
  }, [hasMore, isLoadingMore, messagesQuery, selectedThreadId]);

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

    sendMessageMutation.mutate({
      threadId: selectedThreadId,
      content: normalizedContent,
      clientMessageId: createClientMessageId(),
    });
  }, [
    composerValue,
    currentUserId,
    selectedThreadId,
    sendMessageMutation,
    stopTyping,
  ]);

  const handleRetryMessage = useCallback(
    (clientMessageId: string) => {
      const failedMessage = messages.find(
        (message) => message.clientMessageId === clientMessageId
      );

      if (!failedMessage || !selectedThreadId) {
        return;
      }

      sendMessageMutation.mutate({
        threadId: selectedThreadId,
        content: failedMessage.content,
        clientMessageId,
      });
    },
    [messages, selectedThreadId, sendMessageMutation]
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

  const handleThreadChange = useCallback((threadId: string) => {
    hasManualThreadSelectionRef.current = true;
    setSelectedThreadId(threadId);
  }, []);

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
        onThreadChange={handleThreadChange}
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
        hasMore={hasMore}
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
