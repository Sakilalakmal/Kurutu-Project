"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { DiagramPresenceUser, RealtimeAck } from "@/lib/realtime/events";
import { getSocket } from "@/lib/realtime/socket";
import {
  CursorOverlay,
  type RemoteCursorPresence,
} from "@/components/editor/realtime/CursorOverlay";
import {
  SelectionOverlay,
  type RemoteSelectionPresence,
} from "@/components/editor/realtime/SelectionOverlay";

type RealtimeLayerProps = {
  workspaceId: string;
  diagramId: string;
  currentUserId: string;
  selectedNodeIds: string[];
  onPresenceUsersChange?: (users: DiagramPresenceUser[]) => void;
};

const CURSOR_THROTTLE_MS = 50;
const CURSOR_REMOVE_AFTER_MS = 30_000;

const normalizeNodeIds = (nodeIds: string[]) => Array.from(new Set(nodeIds)).sort();

const hasLocalAccess = (focused: boolean, pointerOverCanvas: boolean) =>
  focused || pointerOverCanvas;

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

export function RealtimeLayer({
  workspaceId,
  diagramId,
  currentUserId,
  selectedNodeIds,
  onPresenceUsersChange,
}: RealtimeLayerProps) {
  const reactFlow = useReactFlow();
  const domNode = useStore((state) => state.domNode);
  const socket = useMemo(() => getSocket(), []);
  const normalizedSelectedNodeIds = useMemo(
    () => normalizeNodeIds(selectedNodeIds),
    [selectedNodeIds]
  );
  const selectedNodeIdsRef = useRef(normalizedSelectedNodeIds);
  const cursorByUserIdRef = useRef<Map<string, RemoteCursorPresence>>(new Map());
  const selectionByUserIdRef = useRef<Map<string, RemoteSelectionPresence>>(new Map());
  const syncRafRef = useRef<number | null>(null);
  const pointerOverCanvasRef = useRef(false);
  const windowFocusedRef = useRef(
    typeof window === "undefined" ? true : window.document.hasFocus()
  );
  const pendingCursorPointRef = useRef<{ x: number; y: number } | null>(null);
  const cursorEmitRafRef = useRef<number | null>(null);
  const lastCursorEmitAtRef = useRef(0);
  const lastCursorDebugLogAtRef = useRef(0);
  const incomingCursorCountRef = useRef(0);
  const lastIncomingCursorDebugLogAtRef = useRef(0);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursorPresence[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<RemoteSelectionPresence[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<DiagramPresenceUser[]>([]);

  const flushVisualState = useCallback(() => {
    syncRafRef.current = null;
    setRemoteCursors(Array.from(cursorByUserIdRef.current.values()));
    setRemoteSelections(
      Array.from(selectionByUserIdRef.current.values()).filter(
        (entry) => entry.selectedNodeIds.length > 0
      )
    );
  }, []);

  const scheduleVisualStateFlush = useCallback(() => {
    if (syncRafRef.current !== null) {
      return;
    }

    syncRafRef.current = window.requestAnimationFrame(flushVisualState);
  }, [flushVisualState]);

  const clearPresenceState = useCallback(() => {
    cursorByUserIdRef.current.clear();
    selectionByUserIdRef.current.clear();
    setPresenceUsers([]);
    scheduleVisualStateFlush();
  }, [scheduleVisualStateFlush]);

  useEffect(() => {
    selectedNodeIdsRef.current = normalizedSelectedNodeIds;
  }, [normalizedSelectedNodeIds]);

  useEffect(() => {
    onPresenceUsersChange?.(presenceUsers);
  }, [onPresenceUsersChange, presenceUsers]);

  useEffect(() => {
    const cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      let removedAny = false;

      for (const [userId, cursor] of cursorByUserIdRef.current.entries()) {
        if (now - cursor.updatedAt > CURSOR_REMOVE_AFTER_MS) {
          cursorByUserIdRef.current.delete(userId);
          removedAny = true;
        }
      }

      if (removedAny) {
        scheduleVisualStateFlush();
      }
    }, 5_000);

    return () => {
      window.clearInterval(cleanupInterval);
    };
  }, [scheduleVisualStateFlush]);

  useEffect(() => {
    const handleFocus = () => {
      windowFocusedRef.current = true;
    };

    const handleBlur = () => {
      windowFocusedRef.current = false;
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!domNode) {
      return;
    }

    const handleRealtimeAck = (eventName: string) => (response: RealtimeAck) => {
      if (!response.ok) {
        devLog(`${eventName} ack error`, response);
      }
    };
    const handleCursorAck = handleRealtimeAck("diagram:cursor");

    const emitCursorFrame = () => {
      if (!hasLocalAccess(windowFocusedRef.current, pointerOverCanvasRef.current)) {
        pendingCursorPointRef.current = null;
        cursorEmitRafRef.current = null;
        return;
      }

      const pendingPoint = pendingCursorPointRef.current;

      if (!pendingPoint) {
        cursorEmitRafRef.current = null;
        return;
      }

      const now = Date.now();

      if (now - lastCursorEmitAtRef.current < CURSOR_THROTTLE_MS) {
        cursorEmitRafRef.current = window.requestAnimationFrame(emitCursorFrame);
        return;
      }

      const flowPoint = reactFlow.screenToFlowPosition(pendingPoint);
      pendingCursorPointRef.current = null;
      cursorEmitRafRef.current = null;
      lastCursorEmitAtRef.current = now;

      if (now - lastCursorDebugLogAtRef.current >= 1_000) {
        devLog("emit cursor", { x: flowPoint.x, y: flowPoint.y });
        lastCursorDebugLogAtRef.current = now;
      }

      socket.emit("diagram:cursor", {
        workspaceId,
        diagramId,
        x: flowPoint.x,
        y: flowPoint.y,
      }, handleCursorAck);
    };

    const handlePointerEnter = () => {
      pointerOverCanvasRef.current = true;
    };

    const handlePointerLeave = () => {
      pointerOverCanvasRef.current = false;
      pendingCursorPointRef.current = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!hasLocalAccess(windowFocusedRef.current, pointerOverCanvasRef.current)) {
        return;
      }

      pendingCursorPointRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      if (cursorEmitRafRef.current === null) {
        cursorEmitRafRef.current = window.requestAnimationFrame(emitCursorFrame);
      }
    };

    domNode.addEventListener("pointerenter", handlePointerEnter);
    domNode.addEventListener("pointerleave", handlePointerLeave);
    domNode.addEventListener("pointermove", handlePointerMove);

    return () => {
      domNode.removeEventListener("pointerenter", handlePointerEnter);
      domNode.removeEventListener("pointerleave", handlePointerLeave);
      domNode.removeEventListener("pointermove", handlePointerMove);
    };
  }, [diagramId, domNode, reactFlow, socket, workspaceId]);

  useEffect(() => {
    const handleRealtimeAck = (eventName: string) => (response: RealtimeAck) => {
      if (!response.ok) {
        devLog(`${eventName} ack error`, response);
      }
    };

    const joinRoom = () => {
      devLog("join room", {
        workspaceId,
        diagramId,
        room: `ws:${workspaceId}:diagram:${diagramId}`,
      });
      socket.emit("diagram:join", {
        workspaceId,
        diagramId,
      }, handleRealtimeAck("diagram:join"));
      socket.emit("diagram:selection", {
        workspaceId,
        diagramId,
        selectedNodeIds: selectedNodeIdsRef.current,
      }, handleRealtimeAck("diagram:selection"));
    };

    const handlePresenceSnapshot = (payload: {
      diagramId: string;
      users: DiagramPresenceUser[];
    }) => {
      if (payload.diagramId !== diagramId) {
        return;
      }

      const userIds = new Set(payload.users.map((entry) => entry.userId));
      setPresenceUsers(payload.users);

      for (const remoteUserId of cursorByUserIdRef.current.keys()) {
        if (!userIds.has(remoteUserId)) {
          cursorByUserIdRef.current.delete(remoteUserId);
        }
      }

      for (const remoteUserId of selectionByUserIdRef.current.keys()) {
        if (!userIds.has(remoteUserId)) {
          selectionByUserIdRef.current.delete(remoteUserId);
        }
      }

      scheduleVisualStateFlush();
    };

    const handleCursor = (payload: {
      userId: string;
      name: string;
      color: string;
      x: number;
      y: number;
      t?: number;
      updatedAt?: number;
    }) => {
      incomingCursorCountRef.current += 1;
      const now = Date.now();
      if (now - lastIncomingCursorDebugLogAtRef.current >= 1_000) {
        devLog("incoming cursor events/s", incomingCursorCountRef.current);
        incomingCursorCountRef.current = 0;
        lastIncomingCursorDebugLogAtRef.current = now;
      }

      if (payload.userId === currentUserId) {
        return;
      }

      cursorByUserIdRef.current.set(payload.userId, {
        userId: payload.userId,
        name: payload.name,
        color: payload.color,
        x: payload.x,
        y: payload.y,
        updatedAt: payload.t ?? payload.updatedAt ?? now,
      });
      scheduleVisualStateFlush();
    };

    const handleSelection = (payload: {
      userId: string;
      name: string;
      color: string;
      selectedNodeIds: string[];
      t?: number;
      updatedAt?: number;
    }) => {
      if (payload.userId === currentUserId) {
        return;
      }

      if (payload.selectedNodeIds.length === 0) {
        selectionByUserIdRef.current.delete(payload.userId);
      } else {
        selectionByUserIdRef.current.set(payload.userId, {
          userId: payload.userId,
          name: payload.name,
          color: payload.color,
          selectedNodeIds: normalizeNodeIds(payload.selectedNodeIds),
          updatedAt: payload.t ?? payload.updatedAt ?? Date.now(),
        });
      }

      scheduleVisualStateFlush();
    };

    const handleUserLeft = (payload: { userId: string }) => {
      cursorByUserIdRef.current.delete(payload.userId);
      selectionByUserIdRef.current.delete(payload.userId);
      setPresenceUsers((currentUsers) =>
        currentUsers.filter((entry) => entry.userId !== payload.userId)
      );
      scheduleVisualStateFlush();
    };

    const handleDisconnect = () => {
      clearPresenceState();
    };

    const handleConnect = () => {
      devLog("socket connected", socket.id);
      joinRoom();
    };

    const handleConnectError = (error: Error) => {
      devLog("socket connect_error", error.message);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("diagram:presenceSnapshot", handlePresenceSnapshot);
    socket.on("diagram:cursor", handleCursor);
    socket.on("diagram:selection", handleSelection);
    socket.on("diagram:userLeft", handleUserLeft);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("diagram:leave", {
        workspaceId,
        diagramId,
      }, handleRealtimeAck("diagram:leave"));
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("diagram:presenceSnapshot", handlePresenceSnapshot);
      socket.off("diagram:cursor", handleCursor);
      socket.off("diagram:selection", handleSelection);
      socket.off("diagram:userLeft", handleUserLeft);
      clearPresenceState();
    };
  }, [
    clearPresenceState,
    currentUserId,
    diagramId,
    scheduleVisualStateFlush,
    socket,
    workspaceId,
  ]);

  useEffect(() => {
    if (!socket.connected) {
      return;
    }

    const handleRealtimeAck = (response: RealtimeAck) => {
      if (!response.ok) {
        devLog("diagram:selection ack error", response);
      }
    };

    socket.emit("diagram:selection", {
      workspaceId,
      diagramId,
      selectedNodeIds: normalizedSelectedNodeIds,
    }, handleRealtimeAck);
  }, [diagramId, normalizedSelectedNodeIds, socket, workspaceId]);

  useEffect(() => {
    return () => {
      if (syncRafRef.current !== null) {
        window.cancelAnimationFrame(syncRafRef.current);
      }

      if (cursorEmitRafRef.current !== null) {
        window.cancelAnimationFrame(cursorEmitRafRef.current);
      }
    };
  }, []);

  return (
    <>
      <SelectionOverlay selections={remoteSelections} />
      <CursorOverlay cursors={remoteCursors} />
    </>
  );
}
