"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatThread } from "@/lib/chat/api";
import type { PresenceUser } from "@/lib/realtime/events";

type ChatHeaderProps = {
  workspaceName: string;
  threads: ChatThread[];
  selectedThreadId: string | null;
  onThreadChange: (threadId: string) => void;
  onlineUsers: PresenceUser[];
  viewingDiagramUsers: PresenceUser[];
  disabled?: boolean;
};

const getThreadLabel = (thread: ChatThread) =>
  thread.type === "WORKSPACE_GENERAL" ? "#general" : thread.title;

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

export function ChatHeader({
  workspaceName,
  threads,
  selectedThreadId,
  onThreadChange,
  onlineUsers,
  viewingDiagramUsers,
  disabled = false,
}: ChatHeaderProps) {
  const visibleOnlineUsers = onlineUsers.slice(0, 5);
  const remainingOnlineCount = Math.max(0, onlineUsers.length - visibleOnlineUsers.length);

  return (
    <header className="space-y-2 px-1">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          Workspace
        </p>
        <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {workspaceName}
        </h2>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center">
            {visibleOnlineUsers.map((user) => (
              <Avatar
                key={user.id}
                size="sm"
                className="-ml-1 first:ml-0 ring-2 ring-white dark:ring-zinc-950"
              >
                <AvatarFallback>{toInitials(user.name)}</AvatarFallback>
              </Avatar>
            ))}
            {remainingOnlineCount > 0 ? (
              <span className="ml-1 rounded-full border border-zinc-300 px-1.5 py-0.5 text-[10px] font-medium dark:border-zinc-700">
                +{remainingOnlineCount}
              </span>
            ) : null}
          </div>
          <span>
            {onlineUsers.length} online
            {` · ${viewingDiagramUsers.length} viewing this diagram`}
          </span>
        </div>
      </div>
      <Select
        value={selectedThreadId ?? undefined}
        onValueChange={onThreadChange}
        disabled={disabled || threads.length === 0}
      >
        <SelectTrigger className="h-9 w-full rounded-xl border-zinc-200 bg-white text-left dark:border-zinc-700 dark:bg-zinc-900">
          <SelectValue placeholder="Select thread" />
        </SelectTrigger>
        <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
          {threads.map((thread) => (
            <SelectItem key={thread.id} value={thread.id}>
              {getThreadLabel(thread)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}
