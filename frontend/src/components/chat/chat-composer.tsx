"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChatComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onTypingActivity?: () => void;
  onSend: () => void;
  isSending: boolean;
  canSend: boolean;
  disabledReason?: string;
};

export function ChatComposer({
  value,
  onValueChange,
  onTypingActivity,
  onSend,
  isSending,
  canSend,
  disabledReason,
}: ChatComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend || isSending) {
      return;
    }

    onSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (canSend && !isSending) {
      onSend();
    }
  };

  const button = (
    <Button
      type="submit"
      size="icon-sm"
      className="h-10 w-10 rounded-xl"
      disabled={!canSend || isSending || value.trim().length === 0}
      aria-label="Send message"
    >
      <SendHorizontal className="size-4" />
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);

          if (canSend) {
            onTypingActivity?.();
          }
        }}
        onKeyDown={handleKeyDown}
        aria-label="Chat message input"
        placeholder="Type a message..."
        maxLength={1000}
        className="min-h-10 max-h-28 resize-none rounded-xl border-zinc-200 bg-white py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
        disabled={!canSend && Boolean(disabledReason)}
      />
      <TooltipProvider>
        {disabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{button}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </TooltipProvider>
    </form>
  );
}
