import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  createEmptyDiagramDocument,
  getDefaultNodeSize,
  getDefaultNodeStyle,
} from "@/lib/diagram/defaults";
import type {
  DiagramDocument,
  DiagramEdgeRecord,
  DiagramEdgeType,
  DiagramNodeRecord,
  DiagramSettings,
  DiagramNodeType,
  DiagramViewport,
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
  onTextChange: (nodeId: string, nextText: string) => void;
};

export type EditorEdge = Edge;

const isDiagramNodeType = (value: string): value is DiagramNodeType =>
  value === "rectangle" || value === "ellipse" || value === "sticky";

export const toFlowNodes = (
  records: DiagramNodeRecord[],
  onTextChange: (nodeId: string, nextText: string) => void
): Node<EditorNodeData>[] =>
  records.map((record) => ({
    id: record.id,
    type: record.type,
    position: record.position,
    data: {
      text: record.text,
      size: record.size,
      style: record.style,
      onTextChange,
    },
  }));

const isDiagramEdgeType = (value: string | undefined): value is DiagramEdgeType =>
  value === "smoothstep" || value === "straight";

export const toFlowEdges = (records: DiagramEdgeRecord[]): EditorEdge[] =>
  records.map((record) => ({
    id: record.id,
    source: record.source,
    target: record.target,
    sourceHandle: record.sourceHandle,
    targetHandle: record.targetHandle,
    type: isDiagramEdgeType(record.type) ? record.type : "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

const toNodeRecord = (node: Node<EditorNodeData>): DiagramNodeRecord | null => {
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
  };
};

const toEdgeRecord = (edge: EditorEdge): DiagramEdgeRecord | null => {
  if (!edge.source || !edge.target) {
    return null;
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: isDiagramEdgeType(edge.type) ? edge.type : "smoothstep",
  };
};

export const toDiagramDocument = (
  nodes: Node<EditorNodeData>[],
  edges: EditorEdge[],
  viewport: DiagramViewport,
  settings: DiagramSettings
): DiagramDocument => {
  const base = createEmptyDiagramDocument();

  return {
    ...base,
    nodes: nodes
      .map((node) => toNodeRecord(node))
      .filter((record): record is DiagramNodeRecord => record !== null),
    edges: edges
      .map((edge) => toEdgeRecord(edge))
      .filter((record): record is DiagramEdgeRecord => record !== null),
    viewport,
    settings,
  };
};
