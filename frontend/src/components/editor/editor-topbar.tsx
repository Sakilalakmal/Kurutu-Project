"use client";

import { MessageSquare, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorTopbarProps = {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
  onOpenMobileChat: () => void;
};

const formatSaveMeta = (status: SaveStatus, savedAt: string | null) => {
  if (status === "saving") {
    return "Saving...";
  }

  if (status === "error") {
    return "Save failed";
  }

  if (status === "saved" && savedAt) {
    const timestamp = new Date(savedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `Saved ${timestamp}`;
  }

  return "Ready";
};

export function EditorTopbar({
  title,
  onTitleChange,
  onSave,
  saveStatus,
  lastSavedAt,
  isDirty,
  onOpenMobileChat,
}: EditorTopbarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-3 backdrop-blur sm:px-5">
      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        aria-label="Diagram title"
        className="h-9 w-[220px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-zinc-300 focus:bg-white sm:w-[320px]"
      />

      <span
        className={cn(
          "hidden text-xs sm:inline",
          saveStatus === "error" ? "text-red-600" : "text-zinc-500"
        )}
      >
        {formatSaveMeta(saveStatus, lastSavedAt)}
      </span>

      {isDirty ? (
        <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline">
          Unsaved changes
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarFallback>AZ</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>WL</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>MI</AvatarFallback>
          </Avatar>
        </AvatarGroup>

        <Button
          size="sm"
          variant="default"
          className={cn(
            "h-8 rounded-lg border border-blue-700 bg-blue-600 text-white shadow-[0_12px_30px_-18px_rgba(37,99,235,0.9)]",
            "hover:bg-blue-500 active:bg-blue-700",
            "focus-visible:ring-2 focus-visible:ring-blue-500",
            saveStatus === "saving" && "cursor-not-allowed opacity-80"
          )}
          onClick={onSave}
          aria-label="Save diagram"
          disabled={saveStatus === "saving"}
        >
          <Save className="size-4" />
          {saveStatus === "saving" ? "Saving" : "Save"}
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          className="h-8 w-8 rounded-lg border-zinc-200 bg-white lg:hidden"
          aria-label="Open chat panel"
          onClick={onOpenMobileChat}
        >
          <MessageSquare className="size-4" />
        </Button>
      </div>
    </header>
  );
}

export type { SaveStatus };
