export const keys = {
  chatThreads: (workspaceId: string) => ["chat", "threads", workspaceId] as const,
  chatMessages: (threadId: string) => ["chat", "messages", threadId] as const,
  workspaceList: () => ["workspaces", "list"] as const,
  workspaceMembers: (workspaceId: string) =>
    ["workspaces", "members", workspaceId] as const,
  diagram: (workspaceId: string, diagramId: string) =>
    ["diagram", workspaceId, diagramId] as const,
};
