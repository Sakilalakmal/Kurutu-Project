"use client";

import type { RefObject } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ChatMessage } from "@/lib/chat/api";
import { cn } from "@/lib/utils";

export type ChatDeliveryStatus = "pending" | "sent" | "failed";

export type ChatMessageListItem = ChatMessage & {
  deliveryStatus: ChatDeliveryStatus;
};

type ChatMessageListProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  messages: ChatMessageListItem[];
  currentUserId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetryMessage: (clientMessageId: string) => void;
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

const DeliveryStatusIcon = ({ status }: { status: ChatDeliveryStatus }) => {
  if (status === "pending") {
    return <Spinner className="size-3 text-zinc-400" />;
  }

  if (status === "failed") {
    return <AlertTriangle className="size-3 text-red-500" />;
  }

  return <Check className="size-3 text-blue-500" />;
};

export function ChatMessageList({
  containerRef,
  messages,
  currentUserId,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRetryMessage,
}: ChatMessageListProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
    >
      {hasMore ? (
        <div className="flex justify-center pb-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full text-xs"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      ) : null}

      {!isLoading && messages.length === 0 ? (
        <div className="px-2 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No messages yet. Start the conversation.
        </div>
      ) : null}

      {!isLoading
        ? messages.map((message) => {
            const isOwn = currentUserId !== null && message.senderUserId === currentUserId;
            const canRetry =
              isOwn &&
              message.deliveryStatus === "failed" &&
              Boolean(message.clientMessageId);

            return (
              <article
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-2xl border px-3 py-2.5 text-sm",
                  isOwn
                    ? "ml-auto border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-[11px]">
                  <Avatar size="sm">
                    <AvatarFallback>{toInitials(message.sender.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium opacity-90">{message.sender.name}</span>
                  <span className="ml-auto flex items-center gap-1 opacity-70">
                    {formatTimestamp(message.createdAt)}
                    {isOwn ? <DeliveryStatusIcon status={message.deliveryStatus} /> : null}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {canRetry ? (
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 rounded-full px-2 text-[11px] text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50"
                      onClick={() => {
                        if (message.clientMessageId) {
                          onRetryMessage(message.clientMessageId);
                        }
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })
        : null}
    </div>
  );
}
