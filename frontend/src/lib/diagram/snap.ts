import type { Node } from "@xyflow/react";
import type { EditorNodeData } from "@/lib/diagram/mapper";

export const snapValue = (value: number, gridSize: number) => {
  if (gridSize <= 0) {
    return value;
  }

  return Math.round(value / gridSize) * gridSize;
};

export const snapPosition = (
  position: { x: number; y: number },
  gridSize: number
) => ({
  x: snapValue(position.x, gridSize),
  y: snapValue(position.y, gridSize),
});

export const snapNodePosition = (
  node: Node<EditorNodeData>,
  gridSize: number
): Node<EditorNodeData> => {
  const nextPosition = snapPosition(node.position, gridSize);

  if (nextPosition.x === node.position.x && nextPosition.y === node.position.y) {
    return node;
  }

  return {
    ...node,
    position: nextPosition,
  };
};
