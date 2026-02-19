"use client";

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
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
import type { EditorEdge, EditorNodeData } from "@/lib/diagram/mapper";
import type { DiagramEdgeType, DiagramViewport, EditorTool } from "@/lib/diagram/types";

type EditorCanvasProps = {
  nodes: Node<EditorNodeData>[];
  edges: EditorEdge[];
  activeTool: EditorTool;
  readOnly?: boolean;
  gridVisible: boolean;
  snapEnabled: boolean;
  gridSize: number;
  defaultEdgeType: DiagramEdgeType;
  initialViewport: DiagramViewport;
  onNodesChange: OnNodesChange<Node<EditorNodeData>>;
  onEdgesChange: OnEdgesChange<EditorEdge>;
  onConnect: (connection: Connection) => void;
  onViewportChange: (viewport: DiagramViewport) => void;
  onCanvasPlaceNode: (position: { x: number; y: number }) => void;
  onReady?: (instance: ReactFlowInstance<Node<EditorNodeData>, EditorEdge>) => void;
  onNodeDragStart?: () => void;
  onNodeDragStop?: (node: Node<EditorNodeData>) => void;
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
  defaultEdgeType,
  initialViewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onViewportChange,
  onCanvasPlaceNode,
  onReady,
  onNodeDragStart,
  onNodeDragStop,
  onLockedNodeInteraction,
}: EditorCanvasProps) {
  const interactiveSelection = !readOnly && activeTool === "select";
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, EditorEdge> | null
  >(null);

  const connectionLineType =
    defaultEdgeType === "straight"
      ? ConnectionLineType.Straight
      : ConnectionLineType.SmoothStep;

  const defaultEdgeOptions = useMemo(
    () => ({
      type: defaultEdgeType,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: false,
    }),
    [defaultEdgeType]
  );

  const handlePaneClick = (
    event: ReactMouseEvent,
    instance: ReactFlowInstance<Node<EditorNodeData>, EditorEdge>
  ) => {
    if (readOnly || activeTool === "select") {
      return;
    }

    const position = instance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    onCanvasPlaceNode(position);
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
        onInit={(instance) => {
          setFlowInstance(instance);
          onReady?.(instance);
        }}
        onNodeDragStart={() => onNodeDragStart?.()}
        onNodeDragStop={(_, node) => onNodeDragStop?.(node)}
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
        {gridVisible ? (
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.1}
            color="rgba(148,163,184,0.45)"
          />
        ) : null}
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
