import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { getDefaultNodeSize, getDefaultNodeStyle } from "@/lib/diagram/defaults";
import { toRuntimeEdgeType, toStoredEdgeStyle } from "@/lib/diagram/edges";
import type {
  DiagramEdgeRecord,
  DiagramNodeRecord,
  DiagramNodeType,
} from "@/lib/diagram/types";

export type EditorNodeData = {
  text: string;
  size: {
    width: number;
    height: number;
  };
  style: {
    fill: string;
    stroke: string;
    textColor: string;
  };
  layerId: string;
  isLocked: boolean;
  isReadOnly: boolean;
  onTextChange: (nodeId: string, nextText: string) => void;
  onLockedInteraction: () => void;
};

export type EditorEdge = Edge & {
  layerId: string;
};

const isDiagramNodeType = (value: string): value is DiagramNodeType =>
  value === "rectangle" ||
  value === "ellipse" ||
  value === "sticky" ||
  value === "wireframeButton" ||
  value === "wireframeInput" ||
  value === "wireframeCard" ||
  value === "wireframeAvatar" ||
  value === "wireframeNavbar" ||
  value === "wireframeSidebar" ||
  value === "wireframeModal";

export const toFlowNodes = (
  records: DiagramNodeRecord[],
  onTextChange: (nodeId: string, nextText: string) => void,
  onLockedInteraction: () => void,
  options?: { readOnly?: boolean }
): Node<EditorNodeData>[] =>
  records.map((record) => ({
    id: record.id,
    type: record.type,
    position: record.position,
    data: {
      text: record.text,
      size: record.size,
      style: record.style,
      layerId: record.layerId,
      isLocked: false,
      isReadOnly: options?.readOnly ?? false,
      onTextChange,
      onLockedInteraction,
    },
  }));

export const toFlowEdges = (records: DiagramEdgeRecord[]): EditorEdge[] =>
  records.map((record) => ({
    id: record.id,
    source: record.source,
    target: record.target,
    sourceHandle: record.sourceHandle,
    targetHandle: record.targetHandle,
    type: toRuntimeEdgeType(toStoredEdgeStyle(record.type)),
    markerEnd: { type: MarkerType.ArrowClosed },
    layerId: record.layerId,
  }));

const toNodeRecord = (node: Node<EditorNodeData>, fallbackLayerId: string): DiagramNodeRecord | null => {
  const rawType = node.type ?? "";

  if (!isDiagramNodeType(rawType)) {
    return null;
  }

  const fallbackSize = getDefaultNodeSize(rawType);
  const fallbackStyle = getDefaultNodeStyle(rawType);

  return {
    id: node.id,
    type: rawType,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    size: node.data?.size ?? fallbackSize,
    text: node.data?.text ?? rawType,
    style: node.data?.style ?? fallbackStyle,
    layerId: node.data?.layerId ?? fallbackLayerId,
  };
};

const toEdgeRecord = (edge: EditorEdge, fallbackLayerId: string): DiagramEdgeRecord | null => {
  if (!edge.source || !edge.target) {
    return null;
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: toStoredEdgeStyle(edge.type),
    layerId: edge.layerId ?? fallbackLayerId,
  };
};

export const toDiagramPageRecords = (
  nodes: Node<EditorNodeData>[],
  edges: EditorEdge[],
  fallbackLayerId: string
) => ({
  nodes: nodes
    .map((node) => toNodeRecord(node, fallbackLayerId))
    .filter((record): record is DiagramNodeRecord => record !== null),
  edges: edges
    .map((edge) => toEdgeRecord(edge, fallbackLayerId))
    .filter((record): record is DiagramEdgeRecord => record !== null),
});
