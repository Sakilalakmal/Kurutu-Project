export const toWorkspaceRoom = (workspaceId: string) => `ws:${workspaceId}`;

export const toThreadRoom = (threadId: string) => `thread:${threadId}`;

export const toDiagramRoom = (workspaceId: string, diagramId: string) =>
  `ws:${workspaceId}:diagram:${diagramId}`;
