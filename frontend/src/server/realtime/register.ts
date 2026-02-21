import {
  authInitPayloadSchema,
  chatSendPayloadSchema,
  diagramCursorPayloadSchema,
  diagramDocumentUpdatedPayloadSchema,
  diagramRoomPayloadSchema,
  diagramSelectionPayloadSchema,
  presenceUpdatePayloadSchema,
  threadTypingPayloadSchema,
  type RealtimeAck,
} from "../../lib/realtime/events";
import { createMessage, isChatServiceError } from "../../lib/chat/server";
import { getUserPresenceColor } from "../../lib/realtime/colors";
import { resolveSocketUser } from "./auth";
import {
  isRealtimeAuthzError,
  requireDiagramInWorkspace,
  requireEditableRole,
  requireThreadAccess,
  requireWorkspaceMember,
} from "./authz";
import { DiagramPresenceManager } from "./diagram-presence";
import { PresenceManager } from "./presence";
import { toDiagramRoom, toThreadRoom, toWorkspaceRoom } from "./rooms";
import { TypingManager } from "./typing";
import type { RealtimeServer, RealtimeSocket } from "./types";

const presenceManager = new PresenceManager();
const typingManager = new TypingManager();
const diagramPresenceManager = new DiagramPresenceManager();

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

const respond = (ack: ((response: RealtimeAck) => void) | undefined, response: RealtimeAck) => {
  ack?.(response);
};

const emitPresenceUpdateForWorkspace = (io: RealtimeServer, workspaceId: string) => {
  const socketIds = presenceManager.getWorkspaceSocketIds(workspaceId);

  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      continue;
    }

    const snapshot = presenceManager.getSnapshot(workspaceId, socket.data.diagramId);
    socket.emit("presence:update", snapshot);
  }
};

const emitTypingStops = (
  io: RealtimeServer,
  stoppedTyping: Array<{ threadId: string; userId: string }>
) => {
  for (const entry of stoppedTyping) {
    io.to(toThreadRoom(entry.threadId)).emit("chat:typing", {
      threadId: entry.threadId,
      userId: entry.userId,
      isTyping: false,
    });
  }
};

const emitDiagramPresenceSnapshot = (
  io: RealtimeServer,
  context: { workspaceId: string; diagramId: string }
) => {
  const roomId = toDiagramRoom(context.workspaceId, context.diagramId);
  const snapshot = diagramPresenceManager.getSnapshot(roomId);

  if (!snapshot) {
    return;
  }

  io.to(roomId).emit("diagram:presenceSnapshot", snapshot);
};

const removeSocketFromDiagramRoom = (
  io: RealtimeServer,
  params: {
    workspaceId: string;
    diagramId: string;
    socketId: string;
    userId: string;
  }
) => {
  const roomId = toDiagramRoom(params.workspaceId, params.diagramId);
  const removalResult = diagramPresenceManager.removeSocketFromRoom(
    {
      roomId,
      workspaceId: params.workspaceId,
      diagramId: params.diagramId,
    },
    {
      socketId: params.socketId,
      userId: params.userId,
    }
  );

  if (removalResult.userLeft) {
    io.to(roomId).emit("diagram:userLeft", { userId: params.userId });
  }

  emitDiagramPresenceSnapshot(io, {
    workspaceId: params.workspaceId,
    diagramId: params.diagramId,
  });
};

const resetSocketContext = (socket: RealtimeSocket) => {
  const previousWorkspaceId = socket.data.workspaceId;
  const previousThreadId = socket.data.threadId;

  if (previousThreadId) {
    socket.leave(toThreadRoom(previousThreadId));
  }

  if (previousWorkspaceId) {
    socket.leave(toWorkspaceRoom(previousWorkspaceId));
  }

  socket.data.workspaceId = null;
  socket.data.diagramId = null;
  socket.data.threadId = null;

  return {
    previousWorkspaceId,
    previousThreadId,
  };
};

export const registerRealtimeHandlers = (io: RealtimeServer) => {
  io.use(async (socket, next) => {
    try {
      const user = await resolveSocketUser(socket);

      if (!user) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.userId = user.userId;
      socket.data.name = user.name;
      socket.data.image = user.image;
      socket.data.workspaceId = null;
      socket.data.diagramId = null;
      socket.data.threadId = null;

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    devLog("server socket connected", socket.id, socket.data.userId);

    socket.on("auth:init", async (payload, ack) => {
      const parsedPayload = authInitPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, { ok: false, error: "Invalid auth payload.", code: "INVALID_PAYLOAD" });
        return;
      }

      const { workspaceId, diagramId, threadId } = parsedPayload.data;

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);

        if (diagramId) {
          await requireDiagramInWorkspace(workspaceId, diagramId);
        }

        if (threadId) {
          const { thread } = await requireThreadAccess(threadId, socket.data.userId);

          if (thread.workspaceId !== workspaceId) {
            respond(ack, {
              ok: false,
              error: "Thread does not belong to workspace.",
              code: "THREAD_WORKSPACE_MISMATCH",
            });
            return;
          }
        }

        const previousContext = resetSocketContext(socket);
        const stoppedTyping = typingManager.stopAllForSocket(socket.id);

        if (stoppedTyping.length > 0) {
          emitTypingStops(io, stoppedTyping);
        }

        socket.join(toWorkspaceRoom(workspaceId));

        if (threadId) {
          socket.join(toThreadRoom(threadId));
        }

        socket.data.workspaceId = workspaceId;
        socket.data.diagramId = diagramId ?? null;
        socket.data.threadId = threadId ?? null;

        presenceManager.upsertSocket(socket.id, {
          workspaceId,
          diagramId: diagramId ?? null,
          user: {
            id: socket.data.userId,
            name: socket.data.name,
            image: socket.data.image,
          },
        });

        const snapshot = presenceManager.getSnapshot(workspaceId, socket.data.diagramId);
        socket.emit("presence:snapshot", snapshot);
        emitPresenceUpdateForWorkspace(io, workspaceId);

        if (
          previousContext.previousWorkspaceId &&
          previousContext.previousWorkspaceId !== workspaceId
        ) {
          emitPresenceUpdateForWorkspace(io, previousContext.previousWorkspaceId);
        }

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, { ok: false, error: "Failed to initialize realtime.", code: "INTERNAL" });
      }
    });

    socket.on("presence:update", async (payload, ack) => {
      const parsedPayload = presenceUpdatePayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, { ok: false, error: "Invalid presence payload.", code: "INVALID_PAYLOAD" });
        return;
      }

      const { workspaceId, diagramId, state } = parsedPayload.data;
      const resolvedDiagramId = state === "viewing" ? diagramId ?? null : null;

      if (state === "viewing" && !resolvedDiagramId) {
        respond(ack, {
          ok: false,
          error: "diagramId is required while viewing.",
          code: "DIAGRAM_REQUIRED",
        });
        return;
      }

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);

        if (resolvedDiagramId) {
          await requireDiagramInWorkspace(workspaceId, resolvedDiagramId);
        }

        const previousWorkspaceId = socket.data.workspaceId;

        if (previousWorkspaceId && previousWorkspaceId !== workspaceId) {
          socket.leave(toWorkspaceRoom(previousWorkspaceId));
        }

        socket.join(toWorkspaceRoom(workspaceId));

        socket.data.workspaceId = workspaceId;
        socket.data.diagramId = resolvedDiagramId;

        if (previousWorkspaceId && previousWorkspaceId !== workspaceId) {
          if (socket.data.threadId) {
            socket.leave(toThreadRoom(socket.data.threadId));
          }

          socket.data.threadId = null;
          const stoppedTyping = typingManager.stopAllForSocket(socket.id);

          if (stoppedTyping.length > 0) {
            emitTypingStops(io, stoppedTyping);
          }
        }

        presenceManager.upsertSocket(socket.id, {
          workspaceId,
          diagramId: resolvedDiagramId,
          user: {
            id: socket.data.userId,
            name: socket.data.name,
            image: socket.data.image,
          },
        });

        emitPresenceUpdateForWorkspace(io, workspaceId);

        if (previousWorkspaceId && previousWorkspaceId !== workspaceId) {
          emitPresenceUpdateForWorkspace(io, previousWorkspaceId);
        }

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, { ok: false, error: "Failed to update presence.", code: "INTERNAL" });
      }
    });

    const handleDiagramJoin = async (payload: unknown, ack?: (response: RealtimeAck) => void) => {
      const parsedPayload = diagramRoomPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid diagram room payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const { workspaceId, diagramId } = parsedPayload.data;
      const roomId = toDiagramRoom(workspaceId, diagramId);
      devLog(
        "server diagram join",
        socket.data.userId,
        workspaceId,
        diagramId,
        roomId
      );

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);
        await requireDiagramInWorkspace(workspaceId, diagramId);

        socket.join(roomId);
        devLog("socket rooms after join", [...socket.rooms]);

        diagramPresenceManager.upsertPresence(
          {
            roomId,
            workspaceId,
            diagramId,
          },
          {
            socketId: socket.id,
            userId: socket.data.userId,
            name: socket.data.name,
            color: getUserPresenceColor(socket.data.userId),
          }
        );

        emitDiagramPresenceSnapshot(io, { workspaceId, diagramId });
        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, {
          ok: false,
          error: "Failed to join diagram room.",
          code: "INTERNAL",
        });
      }
    };

    const handleDiagramLeave = async (payload: unknown, ack?: (response: RealtimeAck) => void) => {
      const parsedPayload = diagramRoomPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid diagram room payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const { workspaceId, diagramId } = parsedPayload.data;

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);
        await requireDiagramInWorkspace(workspaceId, diagramId);

        socket.leave(toDiagramRoom(workspaceId, diagramId));
        removeSocketFromDiagramRoom(io, {
          workspaceId,
          diagramId,
          socketId: socket.id,
          userId: socket.data.userId,
        });

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, {
          ok: false,
          error: "Failed to leave diagram room.",
          code: "INTERNAL",
        });
      }
    };

    socket.on("diagram:join", handleDiagramJoin);
    socket.on("diagram:presenceJoin", handleDiagramJoin);
    socket.on("diagram:leave", handleDiagramLeave);
    socket.on("diagram:presenceLeave", handleDiagramLeave);

    socket.on("diagram:cursor", async (payload, ack) => {
      const parsedPayload = diagramCursorPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid diagram cursor payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const { workspaceId, diagramId, x, y } = parsedPayload.data;
      const roomId = toDiagramRoom(workspaceId, diagramId);
      devLog("server recv cursor", socket.data.userId, workspaceId, diagramId);

      if (!socket.rooms.has(roomId)) {
        respond(ack, {
          ok: false,
          error: "Join diagram room before sending cursor updates.",
          code: "DIAGRAM_ROOM_NOT_JOINED",
        });
        return;
      }

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);
        await requireDiagramInWorkspace(workspaceId, diagramId);

        const t = Date.now();
        const color = getUserPresenceColor(socket.data.userId);

        diagramPresenceManager.upsertPresence(
          {
            roomId,
            workspaceId,
            diagramId,
          },
          {
            socketId: socket.id,
            userId: socket.data.userId,
            name: socket.data.name,
            color,
            now: t,
          }
        );
        devLog("server emit room", roomId);

        socket.to(roomId).emit("diagram:cursor", {
          userId: socket.data.userId,
          name: socket.data.name,
          color,
          x,
          y,
          t,
          updatedAt: t,
        });

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, { ok: false, error: "Failed to publish cursor.", code: "INTERNAL" });
      }
    });

    socket.on("diagram:selection", async (payload, ack) => {
      const parsedPayload = diagramSelectionPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid diagram selection payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const { workspaceId, diagramId } = parsedPayload.data;
      const roomId = toDiagramRoom(workspaceId, diagramId);

      if (!socket.rooms.has(roomId)) {
        respond(ack, {
          ok: false,
          error: "Join diagram room before sending selection updates.",
          code: "DIAGRAM_ROOM_NOT_JOINED",
        });
        return;
      }

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);
        await requireDiagramInWorkspace(workspaceId, diagramId);

        const t = Date.now();
        const color = getUserPresenceColor(socket.data.userId);
        const selectedNodeIds = diagramPresenceManager.setSelection(
          {
            roomId,
            workspaceId,
            diagramId,
          },
          {
            socketId: socket.id,
            userId: socket.data.userId,
            name: socket.data.name,
            color,
            selectedNodeIds: parsedPayload.data.selectedNodeIds,
            now: t,
          }
        );

        socket.to(roomId).emit("diagram:selection", {
          userId: socket.data.userId,
          name: socket.data.name,
          color,
          selectedNodeIds,
          t,
          updatedAt: t,
        });

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, {
          ok: false,
          error: "Failed to publish selection.",
          code: "INTERNAL",
        });
      }
    });

    socket.on("diagram:documentUpdated", async (payload, ack) => {
      const parsedPayload = diagramDocumentUpdatedPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid diagram update payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      const { workspaceId, diagramId, updatedAt } = parsedPayload.data;
      const roomId = toDiagramRoom(workspaceId, diagramId);

      if (!socket.rooms.has(roomId)) {
        respond(ack, {
          ok: false,
          error: "Join diagram room before sending diagram updates.",
          code: "DIAGRAM_ROOM_NOT_JOINED",
        });
        return;
      }

      try {
        await requireWorkspaceMember(workspaceId, socket.data.userId);
        await requireDiagramInWorkspace(workspaceId, diagramId);

        socket.to(roomId).emit("diagram:documentUpdated", {
          workspaceId,
          diagramId,
          updatedAt: updatedAt ?? new Date().toISOString(),
          byUserId: socket.data.userId,
        });

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, {
          ok: false,
          error: "Failed to publish diagram update.",
          code: "INTERNAL",
        });
      }
    });

    socket.on("chat:send", async (payload, ack) => {
      const parsedPayload = chatSendPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid message payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      try {
        const { thread, role } = await requireThreadAccess(
          parsedPayload.data.threadId,
          socket.data.userId
        );
        requireEditableRole(role);

        const result = await createMessage(
          thread.id,
          parsedPayload.data.content,
          socket.data.userId,
          parsedPayload.data.clientMessageId
        );

        if (!result.wasDuplicate) {
          io.to(toThreadRoom(thread.id)).emit("chat:newMessage", {
            message: result.message,
            clientMessageId: result.message.clientMessageId ?? undefined,
            senderUserId: result.message.senderUserId,
          });
        }

        socket.emit("chat:sentAck", {
          clientMessageId: parsedPayload.data.clientMessageId,
          messageId: result.message.id,
          createdAt: result.message.createdAt,
        });

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        if (isChatServiceError(error)) {
          respond(ack, { ok: false, error: error.message, code: "CHAT_ERROR" });
          return;
        }

        respond(ack, { ok: false, error: "Failed to send message.", code: "INTERNAL" });
      }
    });

    socket.on("chat:typingStart", async (payload, ack) => {
      const parsedPayload = threadTypingPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid typing payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      try {
        await requireThreadAccess(parsedPayload.data.threadId, socket.data.userId);
        socket.join(toThreadRoom(parsedPayload.data.threadId));

        const shouldBroadcast = typingManager.startTyping(
          parsedPayload.data.threadId,
          socket.data.userId,
          socket.id
        );

        if (shouldBroadcast) {
          socket.to(toThreadRoom(parsedPayload.data.threadId)).emit("chat:typing", {
            threadId: parsedPayload.data.threadId,
            userId: socket.data.userId,
            isTyping: true,
          });
        }

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, { ok: false, error: "Failed to update typing state.", code: "INTERNAL" });
      }
    });

    socket.on("chat:typingStop", async (payload, ack) => {
      const parsedPayload = threadTypingPayloadSchema.safeParse(payload);

      if (!parsedPayload.success) {
        respond(ack, {
          ok: false,
          error: "Invalid typing payload.",
          code: "INVALID_PAYLOAD",
        });
        return;
      }

      try {
        await requireThreadAccess(parsedPayload.data.threadId, socket.data.userId);

        const shouldBroadcast = typingManager.stopTyping(
          parsedPayload.data.threadId,
          socket.data.userId,
          socket.id
        );

        if (shouldBroadcast) {
          socket.to(toThreadRoom(parsedPayload.data.threadId)).emit("chat:typing", {
            threadId: parsedPayload.data.threadId,
            userId: socket.data.userId,
            isTyping: false,
          });
        }

        respond(ack, { ok: true });
      } catch (error) {
        if (isRealtimeAuthzError(error)) {
          respond(ack, { ok: false, error: error.message, code: error.code });
          return;
        }

        respond(ack, { ok: false, error: "Failed to update typing state.", code: "INTERNAL" });
      }
    });

    socket.on("disconnect", () => {
      const stoppedTyping = typingManager.stopAllForSocket(socket.id);

      if (stoppedTyping.length > 0) {
        emitTypingStops(io, stoppedTyping);
      }

      const previousPresence = presenceManager.removeSocket(socket.id);

      if (previousPresence) {
        emitPresenceUpdateForWorkspace(io, previousPresence.workspaceId);
      }

      const removedDiagramRooms = diagramPresenceManager.removeSocket(
        socket.id,
        socket.data.userId
      );

      for (const removedRoom of removedDiagramRooms) {
        if (removedRoom.userLeft) {
          io.to(removedRoom.roomId).emit("diagram:userLeft", {
            userId: removedRoom.userId,
          });
        }

        emitDiagramPresenceSnapshot(io, {
          workspaceId: removedRoom.workspaceId,
          diagramId: removedRoom.diagramId,
        });
      }
    });
  });
};
