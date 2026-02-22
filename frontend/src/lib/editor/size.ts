import type { Node } from "@xyflow/react";
import { getDefaultNodeSize } from "@/lib/diagram/defaults";
import type { DiagramNodeType } from "@/lib/diagram/types";

type NodeSize = {
  width: number;
  height: number;
};

type NodeWithSize = {
  size?: Partial<NodeSize> | null;
};

const EXPLICIT_NODE_MIN_SIZES: Partial<Record<DiagramNodeType, NodeSize>> = {
  rectangle: { width: 120, height: 80 },
  ellipse: { width: 120, height: 80 },
  sticky: { width: 160, height: 120 },
  textNode: { width: 120, height: 48 },
  dataTable: { width: 220, height: 140 },
};

const isFinitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const getNodeMinSize = (
  type: DiagramNodeType
): { minWidth: number; minHeight: number } => {
  const fallback = getDefaultNodeSize(type);
  const explicit = EXPLICIT_NODE_MIN_SIZES[type];

  return {
    minWidth: explicit?.width ?? fallback.width,
    minHeight: explicit?.height ?? fallback.height,
  };
};

export const getNodeSize = (
  node: NodeWithSize | null | undefined,
  defaults: NodeSize
): NodeSize => ({
  width: isFinitePositive(node?.size?.width) ? node.size.width : defaults.width,
  height: isFinitePositive(node?.size?.height) ? node.size.height : defaults.height,
});

export const setNodeSize = <T extends { size: NodeSize }>(
  nodes: Node<T>[],
  nodeId: string,
  width: number,
  height: number
): Node<T>[] => {
  if (!isFinitePositive(width) || !isFinitePositive(height)) {
    return nodes;
  }

  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.id !== nodeId) {
      return node;
    }

    if (node.data.size.width === width && node.data.size.height === height) {
      return node;
    }

    changed = true;

    return {
      ...node,
      data: {
        ...node.data,
        size: {
          width,
          height,
        },
      },
    };
  });

  return changed ? nextNodes : nodes;
};
