"use client";

import { useMemo } from "react";
import { useReactFlow, useStore } from "@xyflow/react";

export type RemoteSelectionPresence = {
  userId: string;
  name: string;
  color: string;
  selectedNodeIds: string[];
  updatedAt: number;
};

type SelectionOverlayProps = {
  selections: RemoteSelectionPresence[];
};

type SelectionUser = {
  userId: string;
  name: string;
  color: string;
};

export function SelectionOverlay({ selections }: SelectionOverlayProps) {
  const reactFlow = useReactFlow();
  const domNode = useStore((state) => state.domNode);
  const transformKey = useStore((state) => state.transform.join(":"));

  const selectionsByNodeId = useMemo(() => {
    const next = new Map<string, SelectionUser[]>();

    for (const selection of selections) {
      for (const nodeId of selection.selectedNodeIds) {
        const currentUsers = next.get(nodeId) ?? [];

        if (!currentUsers.some((entry) => entry.userId === selection.userId)) {
          currentUsers.push({
            userId: selection.userId,
            name: selection.name,
            color: selection.color,
          });
        }

        next.set(nodeId, currentUsers);
      }
    }

    return next;
  }, [selections]);

  if (!domNode || selectionsByNodeId.size === 0) {
    return null;
  }

  const canvasBounds = domNode.getBoundingClientRect();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      data-transform={transformKey}
    >
      {Array.from(selectionsByNodeId.entries()).map(([nodeId, users]) => {
        const node = reactFlow.getNode(nodeId);

        if (!node) {
          return null;
        }

        const nodeData = (node.data ?? {}) as { size?: { width?: number; height?: number } };
        const nodeWidth = node.measured?.width ?? node.width ?? nodeData.size?.width;
        const nodeHeight = node.measured?.height ?? node.height ?? nodeData.size?.height;

        if (!nodeWidth || !nodeHeight) {
          return null;
        }

        const nodePosition =
          (node as { positionAbsolute?: { x: number; y: number } }).positionAbsolute ??
          node.position;
        const topLeft = reactFlow.flowToScreenPosition(nodePosition);
        const bottomRight = reactFlow.flowToScreenPosition({
          x: nodePosition.x + nodeWidth,
          y: nodePosition.y + nodeHeight,
        });
        const left = topLeft.x - canvasBounds.left;
        const top = topLeft.y - canvasBounds.top;
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;
        const primaryColor = users[0]?.color ?? "#0ea5e9";

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
          return null;
        }

        return (
          <div
            key={nodeId}
            className="absolute rounded-md"
            style={{
              left,
              top,
              width,
              height,
              border: `2px solid ${primaryColor}`,
              boxShadow: `0 0 0 1px ${primaryColor}66`,
            }}
          >
            <div className="absolute -right-2 -top-2 flex items-center">
              {users.slice(0, 3).map((user, index) => (
                <span
                  key={user.userId}
                  className="size-3 rounded-full border border-white shadow-sm"
                  style={{
                    backgroundColor: user.color,
                    marginLeft: index === 0 ? 0 : -4,
                  }}
                  title={user.name}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
