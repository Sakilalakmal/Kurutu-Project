"use client";

import { SendHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const mockMessages = [
  { id: "1", author: "Zaha", body: "Love how modular this layout looks.", own: false },
  { id: "2", author: "You", body: "Let us keep this card for the entry lobby.", own: true },
  { id: "3", author: "Miles", body: "Can we align the notes near the center?", own: false },
];

export function EditorChatPanel({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "flex h-full min-h-[420px] w-full flex-col rounded-2xl border-zinc-200/80 bg-white/90 p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-zinc-900">Chat</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">Mock</span>
      </div>
      <Separator />
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {mockMessages.map((message) => (
          <article
            key={message.id}
            className={cn(
              "max-w-[90%] rounded-2xl border px-3 py-2 text-sm transition-colors duration-200",
              message.own
                ? "ml-auto border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-700"
            )}
          >
            {!message.own ? (
              <div className="mb-2 flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>{message.author.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-zinc-500">{message.author}</span>
              </div>
            ) : null}
            <p>{message.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Input
          aria-label="Chat message input"
          placeholder="Start typing..."
          className="h-9 rounded-xl border-zinc-200 bg-white"
          disabled
        />
        <Button
          size="icon-sm"
          className="h-9 w-9 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
          aria-label="Send message"
          disabled
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
