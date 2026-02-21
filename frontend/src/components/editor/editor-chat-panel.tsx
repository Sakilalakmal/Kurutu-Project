"use client";

import { ChatPanel } from "@/components/chat/chat-panel";

type EditorChatPanelProps = {
  className?: string;
  isOpen: boolean;
  workspaceId: string | null;
  diagramId: string | null;
  diagramTitle: string;
  currentUserId: string | null;
};

export function EditorChatPanel({
  className,
  isOpen,
  workspaceId,
  diagramId,
  diagramTitle,
  currentUserId,
}: EditorChatPanelProps) {
  return (
    <ChatPanel
      className={className}
      isOpen={isOpen}
      workspaceId={workspaceId}
      diagramId={diagramId}
      diagramTitle={diagramTitle}
      currentUserId={currentUserId}
    />
  );
}