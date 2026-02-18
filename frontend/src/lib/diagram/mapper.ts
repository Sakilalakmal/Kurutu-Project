import type { Node } from "@xyflow/react";
import {
  createEmptyDiagramDocument,
  getDefaultNodeSize,
  getDefaultNodeStyle,
} from "@/lib/diagram/defaults";
import type {
  DiagramDocument,
  DiagramNodeRecord,
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

export const toDiagramDocument = (
  nodes: Node<EditorNodeData>[],
  viewport: DiagramViewport
): DiagramDocument => {
  const base = createEmptyDiagramDocument();

  return {
    ...base,
    nodes: nodes
      .map((node) => toNodeRecord(node))
      .filter((record): record is DiagramNodeRecord => record !== null),
    viewport,
  };
};
