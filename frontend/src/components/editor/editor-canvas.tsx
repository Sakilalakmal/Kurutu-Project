"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type OnNodesChange,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { editorNodeTypes } from "@/components/editor/nodes";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import type { DiagramViewport, EditorTool } from "@/lib/diagram/types";

type EditorCanvasProps = {
  nodes: Node<EditorNodeData>[];
  activeTool: EditorTool;
  showGrid: boolean;
  initialViewport: DiagramViewport;
  onNodesChange: OnNodesChange<Node<EditorNodeData>>;
  onViewportChange: (viewport: DiagramViewport) => void;
  onCanvasPlaceNode: (position: { x: number; y: number }) => void;
  onReady: (instance: ReactFlowInstance<Node<EditorNodeData>, never>) => void;
};

function EditorCanvasInner({
  nodes,
  activeTool,
  showGrid,
  initialViewport,
  onNodesChange,
  onViewportChange,
  onCanvasPlaceNode,
  onReady,
}: EditorCanvasProps) {
  const interactiveSelection = activeTool === "select";
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, never> | null
  >(null);

  const handlePaneClick = (
    event: ReactMouseEvent,
    instance: ReactFlowInstance<Node<EditorNodeData>, never>
  ) => {
    if (activeTool === "select") {
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
        edges={[]}
        nodeTypes={editorNodeTypes}
        defaultViewport={initialViewport}
        onNodesChange={onNodesChange}
        onMoveEnd={(_, viewport: Viewport) => onViewportChange(viewport)}
        onPaneClick={(event) => {
          if (!flowInstance) {
            return;
          }

          handlePaneClick(event, flowInstance);
        }}
        onInit={(instance) => {
          setFlowInstance(instance);
          onReady(instance);
        }}
        nodesDraggable={interactiveSelection}
        elementsSelectable={interactiveSelection}
        selectionOnDrag={interactiveSelection}
        panOnDrag={interactiveSelection}
        panOnScroll
        minZoom={0.2}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        fitView={nodes.length === 0}
        className="bg-transparent"
      >
        {showGrid ? (
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
