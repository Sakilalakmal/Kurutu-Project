import type { Node } from "@xyflow/react";
import type { EditorEdge, EditorNodeData } from "@/lib/diagram/mapper";
import { cloneRelationEdgeData, sanitizeRelationEdgeData } from "@/lib/diagram/relations";
import type { DiagramSettings, DiagramStroke, DiagramViewport } from "@/lib/diagram/types";

const MAX_HISTORY_ITEMS = 100;

export type DiagramSnapshot = {
  nodes: Node<EditorNodeData>[];
  edges: EditorEdge[];
  strokes: DiagramStroke[];
  viewport: DiagramViewport;
  settings: DiagramSettings;
};

const cloneNode = (node: Node<EditorNodeData>): Node<EditorNodeData> => ({
  ...node,
  position: { ...node.position },
  data: node.data
    ? {
        ...node.data,
        size: { ...node.data.size },
        style: { ...node.data.style },
        dataModel: node.data.dataModel
          ? {
              tableName: node.data.dataModel.tableName,
              fields: node.data.dataModel.fields.map((field) => ({ ...field })),
            }
          : undefined,
        highlightedFieldIds: node.data.highlightedFieldIds
          ? [...node.data.highlightedFieldIds]
          : undefined,
      }
    : node.data,
});

const cloneEdge = (edge: EditorEdge): EditorEdge => ({
  ...edge,
  markerEnd:
    edge.markerEnd && typeof edge.markerEnd === "object"
      ? { ...edge.markerEnd }
      : edge.markerEnd,
  data: (() => {
    const relationData = sanitizeRelationEdgeData(edge.data);

    return relationData ? cloneRelationEdgeData(relationData) : undefined;
  })(),
});

const cloneSnapshot = (snapshot: DiagramSnapshot): DiagramSnapshot => ({
  nodes: snapshot.nodes.map(cloneNode),
  edges: snapshot.edges.map(cloneEdge),
  strokes: snapshot.strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({ ...point })),
  })),
  viewport: { ...snapshot.viewport },
  settings: { ...snapshot.settings },
});

const snapshotSignature = (snapshot: DiagramSnapshot) =>
  JSON.stringify({
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      selected: Boolean(node.selected),
      text: node.data?.text ?? "",
      size: node.data?.size ?? null,
      style: node.data?.style ?? null,
      layerId: node.data?.layerId ?? null,
      dataModel: node.data?.dataModel ?? null,
    })),
    edges: snapshot.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      type: edge.type ?? "smoothstep",
      selected: Boolean(edge.selected),
      layerId: edge.layerId ?? null,
      data: sanitizeRelationEdgeData(edge.data) ?? null,
    })),
    strokes: snapshot.strokes.map((stroke) => ({
      id: stroke.id,
      layerId: stroke.layerId,
      color: stroke.color,
      width: stroke.width,
      opacity: stroke.opacity ?? 1,
      points: stroke.points.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    })),
    viewport: snapshot.viewport,
    settings: snapshot.settings,
  });

export const createHistory = (initialSnapshot: DiagramSnapshot) => {
  let present = cloneSnapshot(initialSnapshot);
  let past: DiagramSnapshot[] = [];
  let future: DiagramSnapshot[] = [];

  const canUndo = () => past.length > 0;
  const canRedo = () => future.length > 0;

  const reset = (snapshot: DiagramSnapshot) => {
    present = cloneSnapshot(snapshot);
    past = [];
    future = [];
  };

  const push = (nextSnapshot: DiagramSnapshot) => {
    const candidate = cloneSnapshot(nextSnapshot);

    if (snapshotSignature(candidate) === snapshotSignature(present)) {
      return;
    }

    past = [...past, present].slice(-MAX_HISTORY_ITEMS);
    present = candidate;
    future = [];
  };

  const undo = (): DiagramSnapshot | null => {
    if (!canUndo()) {
      return null;
    }

    const previous = past[past.length - 1];
    past = past.slice(0, -1);
    future = [present, ...future].slice(0, MAX_HISTORY_ITEMS);
    present = previous;

    return cloneSnapshot(present);
  };

  const redo = (): DiagramSnapshot | null => {
    if (!canRedo()) {
      return null;
    }

    const next = future[0];
    future = future.slice(1);
    past = [...past, present].slice(-MAX_HISTORY_ITEMS);
    present = next;

    return cloneSnapshot(present);
  };

  return {
    canUndo,
    canRedo,
    reset,
    push,
    undo,
    redo,
    current: () => cloneSnapshot(present),
  };
};
