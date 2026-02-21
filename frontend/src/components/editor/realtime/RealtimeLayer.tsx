"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { DiagramPresenceUser } from "@/lib/realtime/events";
import { getRealtimeSocket } from "@/lib/realtime/socket";
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

export function RealtimeLayer({
  workspaceId,
  diagramId,
  currentUserId,
  selectedNodeIds,
  onPresenceUsersChange,
}: RealtimeLayerProps) {
  const reactFlow = useReactFlow();
  const domNode = useStore((state) => state.domNode);
  const socket = useMemo(() => getRealtimeSocket(), []);
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

      socket.emit("diagram:cursor", {
        workspaceId,
        diagramId,
        x: flowPoint.x,
        y: flowPoint.y,
      });
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
    const joinRoom = () => {
      socket.emit("diagram:presenceJoin", {
        workspaceId,
        diagramId,
      });
      socket.emit("diagram:selection", {
        workspaceId,
        diagramId,
        selectedNodeIds: selectedNodeIdsRef.current,
      });
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

    const handleCursor = (payload: RemoteCursorPresence) => {
      if (payload.userId === currentUserId) {
        return;
      }

      cursorByUserIdRef.current.set(payload.userId, payload);
      scheduleVisualStateFlush();
    };

    const handleSelection = (payload: RemoteSelectionPresence) => {
      if (payload.userId === currentUserId) {
        return;
      }

      if (payload.selectedNodeIds.length === 0) {
        selectionByUserIdRef.current.delete(payload.userId);
      } else {
        selectionByUserIdRef.current.set(payload.userId, {
          ...payload,
          selectedNodeIds: normalizeNodeIds(payload.selectedNodeIds),
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

    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("diagram:presenceSnapshot", handlePresenceSnapshot);
    socket.on("diagram:cursor", handleCursor);
    socket.on("diagram:selection", handleSelection);
    socket.on("diagram:userLeft", handleUserLeft);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.emit("diagram:presenceLeave", {
        workspaceId,
        diagramId,
      });
      socket.off("connect", joinRoom);
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

    socket.emit("diagram:selection", {
      workspaceId,
      diagramId,
      selectedNodeIds: normalizedSelectedNodeIds,
    });
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
