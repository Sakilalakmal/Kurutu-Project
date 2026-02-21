"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatThread } from "@/lib/chat/api";

type ChatHeaderProps = {
  workspaceName: string;
  threads: ChatThread[];
  selectedThreadId: string | null;
  onThreadChange: (threadId: string) => void;
  disabled?: boolean;
};

const getThreadLabel = (thread: ChatThread) =>
  thread.type === "WORKSPACE_GENERAL" ? "#general" : thread.title;

export function ChatHeader({
  workspaceName,
  threads,
  selectedThreadId,
  onThreadChange,
  disabled = false,
}: ChatHeaderProps) {
  return (
    <header className="space-y-2 px-1">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          Workspace
        </p>
        <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {workspaceName}
        </h2>
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