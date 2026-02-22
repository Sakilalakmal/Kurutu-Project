import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  createDefaultDataTableNodeData,
  getDataTableNodeHeight,
  getDefaultNodeSize,
  getDefaultNodeStyle,
} from "@/lib/diagram/defaults";
import { getNodeSize } from "@/lib/editor/size";
import { toRuntimeEdgeType, toStoredEdgeStyle } from "@/lib/diagram/edges";
import {
  cloneRelationEdgeData,
  sanitizeDataTableNodeData,
  sanitizeRelationEdgeData,
} from "@/lib/diagram/relations";
import type {
  DataTableField,
  DataTableNodeData,
  DiagramEdgeRecord,
  DiagramNodeRecord,
  DiagramNodeType,
  RelationEdgeData,
} from "@/lib/diagram/types";

export type NodeResizePayload = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
    strokeWidth?: number;
    fontSize?: number;
  };
  layerId: string;
  isLocked: boolean;
  isReadOnly: boolean;
  autoEdit?: boolean;
  dataModel?: DataTableNodeData;
  highlightedFieldIds?: string[];
  relationHighlight?: "none" | "subtle" | "strong";
  onTextChange: (nodeId: string, nextText: string) => void;
  onDataTableTableNameCommit?: (nodeId: string, nextTableName: string) => void;
  onDataTableFieldCommit?: (
    nodeId: string,
    fieldId: string,
    patch: Partial<Pick<DataTableField, "name" | "type">>
  ) => void;
  onDataTableFieldToggle?: (nodeId: string, fieldId: string, key: "isPK" | "isFK") => void;
  onDataTableFieldAdd?: (nodeId: string) => void;
  onDataTableFieldDelete?: (nodeId: string, fieldId: string) => void;
  onDataTableFieldMove?: (nodeId: string, fieldId: string, direction: "up" | "down") => void;
  onResize?: (nodeId: string, params: NodeResizePayload) => void;
  onResizeEnd?: (nodeId: string, params: NodeResizePayload) => void;
  onLockedInteraction: () => void;
};

export type RuntimeRelationEdgeData = RelationEdgeData & {
  isHovered?: boolean;
  isConnectedToHoveredNode?: boolean;
  isDimmed?: boolean;
  readOnly?: boolean;
  onHoverChange?: (edgeId: string | null) => void;
  onRelationDataChange?: (edgeId: string, updates: Partial<RelationEdgeData>) => void;
};

export type EditorEdge = Edge<Record<string, unknown>> & {
  layerId: string;
  data?: RuntimeRelationEdgeData;
};

const isDiagramNodeType = (value: string): value is DiagramNodeType =>
  value === "rectangle" ||
  value === "ellipse" ||
  value === "sticky" ||
  value === "textNode" ||
  value === "dataTable" ||
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
  options?: {
    readOnly?: boolean;
    autoEditNodeId?: string | null;
    onResize?: (nodeId: string, params: NodeResizePayload) => void;
    onResizeEnd?: (nodeId: string, params: NodeResizePayload) => void;
  }
): Node<EditorNodeData>[] =>
  records.map((record) => {
    const dataModel =
      record.type === "dataTable"
        ? sanitizeDataTableNodeData(record.data) ??
          createDefaultDataTableNodeData(record.text || "Table")
        : undefined;
    const fallbackSize =
      record.type === "dataTable" && dataModel
        ? {
            width: getDefaultNodeSize(record.type).width,
            height: getDataTableNodeHeight(dataModel.fields.length),
          }
        : getDefaultNodeSize(record.type);

    return {
      id: record.id,
      type: record.type,
      position: record.position,
      data: {
        text: record.text,
        size: getNodeSize({ size: record.size }, fallbackSize),
        style: record.style,
        layerId: record.layerId,
        isLocked: false,
        isReadOnly: options?.readOnly ?? false,
        autoEdit: options?.autoEditNodeId === record.id,
        dataModel,
        onResize: options?.onResize,
        onResizeEnd: options?.onResizeEnd,
        onTextChange,
        onLockedInteraction,
      },
    };
  });

export const toFlowEdges = (records: DiagramEdgeRecord[]): EditorEdge[] =>
  records.map((record) => {
    const relationData = sanitizeRelationEdgeData(record.data);

    return {
      id: record.id,
      source: record.source,
      target: record.target,
      sourceHandle: record.sourceHandle,
      targetHandle: record.targetHandle,
      type: relationData ? "relationEdge" : toRuntimeEdgeType(toStoredEdgeStyle(record.type)),
      markerEnd: relationData ? undefined : { type: MarkerType.ArrowClosed },
      data: relationData ? { ...relationData } : undefined,
      layerId: record.layerId,
    };
  });

const toNodeRecord = (node: Node<EditorNodeData>, fallbackLayerId: string): DiagramNodeRecord | null => {
  const rawType = node.type ?? "";

  if (!isDiagramNodeType(rawType)) {
    return null;
  }

  const fallbackSize =
    rawType === "dataTable" && node.data?.dataModel
      ? {
          width: getDefaultNodeSize(rawType).width,
          height: getDataTableNodeHeight(node.data.dataModel.fields.length),
        }
      : getDefaultNodeSize(rawType);
  const fallbackStyle = getDefaultNodeStyle(rawType);

  return {
    id: node.id,
    type: rawType,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    size: getNodeSize(node.data, fallbackSize),
    text: node.data?.text ?? rawType,
    style: node.data?.style ?? fallbackStyle,
    layerId: node.data?.layerId ?? fallbackLayerId,
    data:
      rawType === "dataTable" && node.data?.dataModel
        ? sanitizeDataTableNodeData(node.data.dataModel)
        : undefined,
  };
};

const toEdgeRecord = (edge: EditorEdge, fallbackLayerId: string): DiagramEdgeRecord | null => {
  if (!edge.source || !edge.target) {
    return null;
  }

  const relationData = sanitizeRelationEdgeData(edge.data);

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: relationData ? undefined : toStoredEdgeStyle(edge.type),
    layerId: edge.layerId ?? fallbackLayerId,
    data: relationData ? cloneRelationEdgeData(relationData) : undefined,
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
