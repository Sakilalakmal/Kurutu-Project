import type { DiagramPresenceUser } from "../../lib/realtime/events";

type RoomMeta = {
  workspaceId: string;
  diagramId: string;
};

type PresenceEntry = DiagramPresenceUser & {
  socketIds: Set<string>;
};

type SelectionEntry = {
  userId: string;
  name: string;
  color: string;
  selectedNodeIds: string[];
  updatedAt: number;
  socketIds: Set<string>;
};

export type DiagramRoomContext = {
  roomId: string;
  workspaceId: string;
  diagramId: string;
};

export type SocketRoomRemoval = {
  roomId: string;
  workspaceId: string;
  diagramId: string;
  userId: string;
  userLeft: boolean;
};

const dedupeNodeIds = (value: string[]) => Array.from(new Set(value));

export class DiagramPresenceManager {
  private readonly presenceByRoom = new Map<string, Map<string, PresenceEntry>>();

  private readonly selectionByRoom = new Map<string, Map<string, SelectionEntry>>();

  private readonly roomsBySocket = new Map<string, Set<string>>();

  private readonly roomMetaById = new Map<string, RoomMeta>();

  private trackSocketRoom(socketId: string, roomId: string) {
    const roomIds = this.roomsBySocket.get(socketId) ?? new Set<string>();
    roomIds.add(roomId);
    this.roomsBySocket.set(socketId, roomIds);
  }

  private untrackSocketRoom(socketId: string, roomId: string) {
    const roomIds = this.roomsBySocket.get(socketId);

    if (!roomIds) {
      return;
    }

    roomIds.delete(roomId);

    if (roomIds.size === 0) {
      this.roomsBySocket.delete(socketId);
    }
  }

  private setRoomMeta(context: DiagramRoomContext) {
    this.roomMetaById.set(context.roomId, {
      workspaceId: context.workspaceId,
      diagramId: context.diagramId,
    });
  }

  private maybeDeleteRoomMeta(roomId: string) {
    const hasPresence = (this.presenceByRoom.get(roomId)?.size ?? 0) > 0;
    const hasSelections = (this.selectionByRoom.get(roomId)?.size ?? 0) > 0;

    if (!hasPresence && !hasSelections) {
      this.roomMetaById.delete(roomId);
    }
  }

  upsertPresence(
    context: DiagramRoomContext,
    params: {
      socketId: string;
      userId: string;
      name: string;
      color: string;
      now?: number;
    }
  ) {
    const now = params.now ?? Date.now();
    this.setRoomMeta(context);
    this.trackSocketRoom(params.socketId, context.roomId);

    const roomPresence = this.presenceByRoom.get(context.roomId) ?? new Map<string, PresenceEntry>();
    const existing = roomPresence.get(params.userId);
    const socketIds = existing?.socketIds ?? new Set<string>();

    socketIds.add(params.socketId);

    roomPresence.set(params.userId, {
      userId: params.userId,
      name: params.name,
      color: params.color,
      lastSeenAt: now,
      socketIds,
    });

    this.presenceByRoom.set(context.roomId, roomPresence);
  }

  setSelection(
    context: DiagramRoomContext,
    params: {
      socketId: string;
      userId: string;
      name: string;
      color: string;
      selectedNodeIds: string[];
      now?: number;
    }
  ) {
    const now = params.now ?? Date.now();
    const selectedNodeIds = dedupeNodeIds(params.selectedNodeIds);

    this.upsertPresence(context, {
      socketId: params.socketId,
      userId: params.userId,
      name: params.name,
      color: params.color,
      now,
    });

    const roomSelections = this.selectionByRoom.get(context.roomId) ?? new Map<string, SelectionEntry>();

    if (selectedNodeIds.length === 0) {
      roomSelections.delete(params.userId);

      if (roomSelections.size === 0) {
        this.selectionByRoom.delete(context.roomId);
      } else {
        this.selectionByRoom.set(context.roomId, roomSelections);
      }

      return selectedNodeIds;
    }

    const existing = roomSelections.get(params.userId);
    const socketIds = existing?.socketIds ?? new Set<string>();
    socketIds.add(params.socketId);

    roomSelections.set(params.userId, {
      userId: params.userId,
      name: params.name,
      color: params.color,
      selectedNodeIds,
      updatedAt: now,
      socketIds,
    });

    this.selectionByRoom.set(context.roomId, roomSelections);

    return selectedNodeIds;
  }

  getSnapshot(roomId: string) {
    const roomMeta = this.roomMetaById.get(roomId);

    if (!roomMeta) {
      return null;
    }

    const users = Array.from(this.presenceByRoom.get(roomId)?.values() ?? [])
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => ({
        userId: entry.userId,
        name: entry.name,
        color: entry.color,
        lastSeenAt: entry.lastSeenAt,
      }));

    return {
      diagramId: roomMeta.diagramId,
      users,
    };
  }

  removeSocketFromRoom(
    context: DiagramRoomContext,
    params: {
      socketId: string;
      userId: string;
    }
  ) {
    this.untrackSocketRoom(params.socketId, context.roomId);

    const roomPresence = this.presenceByRoom.get(context.roomId);
    const roomSelections = this.selectionByRoom.get(context.roomId);
    let userLeft = false;

    const presenceEntry = roomPresence?.get(params.userId);
    presenceEntry?.socketIds.delete(params.socketId);

    if (presenceEntry && presenceEntry.socketIds.size === 0) {
      roomPresence?.delete(params.userId);
      userLeft = true;
    }

    if (roomPresence && roomPresence.size === 0) {
      this.presenceByRoom.delete(context.roomId);
    }

    const selectionEntry = roomSelections?.get(params.userId);
    selectionEntry?.socketIds.delete(params.socketId);

    if (selectionEntry && selectionEntry.socketIds.size === 0) {
      roomSelections?.delete(params.userId);
    }

    if (roomSelections && roomSelections.size === 0) {
      this.selectionByRoom.delete(context.roomId);
    }

    this.maybeDeleteRoomMeta(context.roomId);

    return { userLeft };
  }

  removeSocket(socketId: string, userId: string) {
    const roomIds = Array.from(this.roomsBySocket.get(socketId) ?? []);
    const removals: SocketRoomRemoval[] = [];

    for (const roomId of roomIds) {
      const roomMeta = this.roomMetaById.get(roomId);

      if (!roomMeta) {
        continue;
      }

      const result = this.removeSocketFromRoom(
        {
          roomId,
          workspaceId: roomMeta.workspaceId,
          diagramId: roomMeta.diagramId,
        },
        { socketId, userId }
      );

      removals.push({
        roomId,
        workspaceId: roomMeta.workspaceId,
        diagramId: roomMeta.diagramId,
        userId,
        userLeft: result.userLeft,
      });
    }

    return removals;
  }

  getSelections(roomId: string) {
    return Array.from(this.selectionByRoom.get(roomId)?.values() ?? []);
  }
}

