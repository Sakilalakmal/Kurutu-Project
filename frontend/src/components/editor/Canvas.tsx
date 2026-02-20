"use client";

import {
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import { editorNodeTypes } from "@/components/editor/nodes";
import { PenOverlay } from "@/components/editor/PenOverlay";
import { SnapGuidesOverlay } from "@/components/editor/SnapGuidesOverlay";
import { ASSET_DRAG_MIME } from "@/lib/assets/catalog";
import { toConnectionLineType, toRuntimeEdgeType } from "@/lib/diagram/edges";
import type { EditorEdge, EditorNodeData } from "@/lib/diagram/mapper";
import type { SnapGuides } from "@/lib/diagram/smartSnap";
import type {
  DiagramEdgeType,
  DiagramStroke,
  DiagramViewport,
  EditorTool,
} from "@/lib/diagram/types";

type EditorCanvasProps = {
  nodes: Node<EditorNodeData>[];
  edges: EditorEdge[];
  activeTool: EditorTool;
  readOnly?: boolean;
  gridVisible: boolean;
  snapEnabled: boolean;
  gridSize: number;
  snapGuides?: SnapGuides | null;
  edgeStyle: DiagramEdgeType;
  edgeAnimated: boolean;
  strokes: DiagramStroke[];
  penBrushColor: string;
  penBrushWidth: number;
  penBrushOpacity: number;
  penEraserEnabled: boolean;
  initialViewport: DiagramViewport;
  onNodesChange: OnNodesChange<Node<EditorNodeData>>;
  onEdgesChange: OnEdgesChange<EditorEdge>;
  onConnect: (connection: Connection) => void;
  onViewportChange: (viewport: DiagramViewport) => void;
  onCanvasPlaceNode: (position: { x: number; y: number }) => void;
  onAssetDrop?: (assetId: string, position: { x: number; y: number }) => void;
  onPenStrokeCreate: (stroke: {
    color: string;
    width: number;
    opacity: number;
    points: Array<{ x: number; y: number }>;
  }) => void;
  onPenStrokeDelete: (strokeId: string) => void;
  onReady?: (instance: ReactFlowInstance<Node<EditorNodeData>, EditorEdge>) => void;
  onNodeDragStart?: (
    node: Node<EditorNodeData>,
    draggingNodes: Node<EditorNodeData>[]
  ) => void;
  onNodeDrag?: (node: Node<EditorNodeData>, draggingNodes: Node<EditorNodeData>[]) => void;
  onNodeDragStop?: (
    node: Node<EditorNodeData>,
    draggingNodes: Node<EditorNodeData>[]
  ) => void;
  onLockedNodeInteraction: () => void;
};

function EditorCanvasInner({
  nodes,
  edges,
  activeTool,
  readOnly = false,
  gridVisible,
  snapEnabled,
  gridSize,
  snapGuides,
  edgeStyle,
  edgeAnimated,
  strokes,
  penBrushColor,
  penBrushWidth,
  penBrushOpacity,
  penEraserEnabled,
  initialViewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onViewportChange,
  onCanvasPlaceNode,
  onAssetDrop,
  onPenStrokeCreate,
  onPenStrokeDelete,
  onReady,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onLockedNodeInteraction,
}: EditorCanvasProps) {
  const interactiveSelection = !readOnly && activeTool === "select";
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, EditorEdge> | null
  >(null);

  const connectionLineType = toConnectionLineType(edgeStyle);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: toRuntimeEdgeType(edgeStyle),
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: edgeAnimated,
    }),
    [edgeAnimated, edgeStyle]
  );

  const handlePaneClick = (
    event: ReactMouseEvent,
    instance: ReactFlowInstance<Node<EditorNodeData>, EditorEdge>
  ) => {
    if (readOnly || activeTool === "select" || activeTool === "pen") {
      return;
    }

    const position = instance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    onCanvasPlaceNode(position);
  };

  const handleDragOver = (event: ReactDragEvent) => {
    if (!onAssetDrop || readOnly) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (
    event: ReactDragEvent,
    instance: ReactFlowInstance<Node<EditorNodeData>, EditorEdge>
  ) => {
    if (!onAssetDrop || readOnly) {
      return;
    }

    event.preventDefault();
    const assetId =
      event.dataTransfer.getData(ASSET_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");

    if (!assetId) {
      return;
    }

    const position = instance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    onAssetDrop(assetId, position);
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-[#fafafa] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={editorNodeTypes}
        defaultViewport={initialViewport}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={connectionLineType}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onMoveEnd={(_, viewport: Viewport) => onViewportChange(viewport)}
        onPaneClick={(event) => {
          if (!flowInstance) {
            return;
          }

          handlePaneClick(event, flowInstance);
        }}
        onDragOver={handleDragOver}
        onDrop={(event) => {
          if (!flowInstance) {
            return;
          }

          handleDrop(event, flowInstance);
        }}
        onInit={(instance) => {
          setFlowInstance(instance);
          onReady?.(instance);
        }}
        onNodeDragStart={(_, node, draggingNodes) => onNodeDragStart?.(node, draggingNodes)}
        onNodeDrag={(_, node, draggingNodes) => onNodeDrag?.(node, draggingNodes)}
        onNodeDragStop={(_, node, draggingNodes) => onNodeDragStop?.(node, draggingNodes)}
        onNodeClick={(_, node) => {
          if (node.data?.isLocked) {
            onLockedNodeInteraction();
          }
        }}
        nodesDraggable={interactiveSelection}
        nodesConnectable={interactiveSelection}
        elementsSelectable={interactiveSelection}
        selectionOnDrag={interactiveSelection}
        panOnDrag
        panOnScroll
        panActivationKeyCode="Space"
        deleteKeyCode={null}
        snapToGrid={snapEnabled}
        snapGrid={[gridSize, gridSize]}
        minZoom={0.2}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        fitView={nodes.length === 0}
        className="bg-transparent"
      >
        <PenOverlay
          strokes={strokes}
          activeTool={activeTool}
          readOnly={readOnly}
          brushColor={penBrushColor}
          brushWidth={penBrushWidth}
          brushOpacity={penBrushOpacity}
          eraserEnabled={penEraserEnabled}
          onCreateStroke={onPenStrokeCreate}
          onDeleteStroke={onPenStrokeDelete}
        />
        {gridVisible ? (
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.1}
            color="rgba(148,163,184,0.45)"
          />
        ) : null}
        <SnapGuidesOverlay guides={snapGuides} />
      </ReactFlow>
    </div>
  );
}

export function EditorCanvas(props: EditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <EditorCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
