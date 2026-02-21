import type { PresencePayload, PresenceUser } from "../../lib/realtime/events";

type SocketPresenceState = {
  workspaceId: string;
  diagramId: string | null;
  user: PresenceUser;
};

export class PresenceManager {
  private readonly socketState = new Map<string, SocketPresenceState>();

  private readonly workspaceSockets = new Map<string, Set<string>>();

  upsertSocket(
    socketId: string,
    state: {
      workspaceId: string;
      diagramId: string | null;
      user: PresenceUser;
    }
  ) {
    const previousState = this.socketState.get(socketId);

    if (previousState) {
      const previousWorkspaceSockets = this.workspaceSockets.get(previousState.workspaceId);

      previousWorkspaceSockets?.delete(socketId);

      if (previousWorkspaceSockets && previousWorkspaceSockets.size === 0) {
        this.workspaceSockets.delete(previousState.workspaceId);
      }
    }

    this.socketState.set(socketId, state);

    const sockets = this.workspaceSockets.get(state.workspaceId) ?? new Set<string>();
    sockets.add(socketId);
    this.workspaceSockets.set(state.workspaceId, sockets);

    return previousState ?? null;
  }

  removeSocket(socketId: string) {
    const existing = this.socketState.get(socketId);

    if (!existing) {
      return null;
    }

    this.socketState.delete(socketId);

    const sockets = this.workspaceSockets.get(existing.workspaceId);
    sockets?.delete(socketId);

    if (sockets && sockets.size === 0) {
      this.workspaceSockets.delete(existing.workspaceId);
    }

    return existing;
  }

  getWorkspaceSocketIds(workspaceId: string) {
    return Array.from(this.workspaceSockets.get(workspaceId) ?? []);
  }

  getSnapshot(workspaceId: string, diagramId: string | null): PresencePayload {
    const onlineByUserId = new Map<string, PresenceUser>();
    const viewingByUserId = new Map<string, PresenceUser>();

    for (const state of this.socketState.values()) {
      if (state.workspaceId !== workspaceId) {
        continue;
      }

      onlineByUserId.set(state.user.id, state.user);

      if (diagramId && state.diagramId === diagramId) {
        viewingByUserId.set(state.user.id, state.user);
      }
    }

    return {
      workspaceId,
      onlineUsers: Array.from(onlineByUserId.values()),
      viewingDiagramUsers: Array.from(viewingByUserId.values()),
    };
  }
}
