"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import { useNodesState } from "@xyflow/react";
import { Toaster, toast } from "sonner";
import { EditorBottomControls } from "@/components/editor/editor-bottom-controls";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorChatPanel } from "@/components/editor/editor-chat-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorTopbar, type SaveStatus } from "@/components/editor/editor-topbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { fetchLatestDiagram, updateDiagram } from "@/lib/diagram/api";
import { createDefaultNodeRecord, DEFAULT_VIEWPORT } from "@/lib/diagram/defaults";
import { toDiagramDocument, toFlowNodes, type EditorNodeData } from "@/lib/diagram/mapper";
import type { DiagramViewport, EditorTool, DiagramNodeType } from "@/lib/diagram/types";

const AUTOSAVE_DELAY_MS = 800;

const createNodeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isPlaceableNodeTool = (tool: EditorTool): tool is DiagramNodeType =>
  tool === "rectangle" || tool === "ellipse" || tool === "sticky";

export function EditorShell() {
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Diagram");
  const [viewport, setViewport] = useState<DiagramViewport>(DEFAULT_VIEWPORT);
  const [canvasViewport, setCanvasViewport] = useState<DiagramViewport>(DEFAULT_VIEWPORT);
  const [canvasMountKey, setCanvasMountKey] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, never> | null
  >(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EditorNodeData>>([]);
  const hasHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignatureRef = useRef<string>("");

  const handleNodeTextChange = useCallback((nodeId: string, nextText: string) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                text: nextText,
              },
            }
          : node
      )
    );
  }, [setNodes]);

  useEffect(() => {
    let isCancelled = false;

    const loadDiagram = async () => {
      try {
        const diagram = await fetchLatestDiagram();

        if (isCancelled) {
          return;
        }

        const loadedNodes = toFlowNodes(diagram.data.nodes, handleNodeTextChange);
        const loadedViewport = diagram.data.viewport ?? DEFAULT_VIEWPORT;
        const loadedTitle = diagram.title.trim().length > 0 ? diagram.title : "Untitled Diagram";

        setDiagramId(diagram.id);
        setTitle(loadedTitle);
        setNodes(loadedNodes);
        setViewport(loadedViewport);
        setCanvasViewport(loadedViewport);
        setCanvasMountKey((previous) => previous + 1);
        setLastSavedAt(diagram.updatedAt);
        setSaveStatus("saved");
        lastSavedSignatureRef.current = JSON.stringify({
          title: loadedTitle,
          data: diagram.data,
        });
        hasHydratedRef.current = true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load your latest diagram."
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDiagram();

    return () => {
      isCancelled = true;
    };
  }, [handleNodeTextChange, setNodes]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const normalizedTitle = title.trim() || "Untitled Diagram";
  const diagramDocument = useMemo(() => toDiagramDocument(nodes, viewport), [nodes, viewport]);
  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        title: normalizedTitle,
        data: diagramDocument,
      }),
    [diagramDocument, normalizedTitle]
  );
  const isDirty = currentSignature !== lastSavedSignatureRef.current;

  const saveDiagram = useCallback(async () => {
    if (!diagramId) {
      return;
    }

    if (currentSignature === lastSavedSignatureRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");

    try {
      const updated = await updateDiagram({
        diagramId,
        payload: {
          title: normalizedTitle,
          data: diagramDocument,
        },
      });

      lastSavedSignatureRef.current = currentSignature;
      setLastSavedAt(updated.updatedAt);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to save diagram.");
    }
  }, [currentSignature, diagramDocument, diagramId, normalizedTitle]);

  useEffect(() => {
    if (!hasHydratedRef.current || !diagramId || isLoading) {
      return;
    }

    if (currentSignature === lastSavedSignatureRef.current) {
      return;
    }

    setSaveStatus((current) => (current === "saving" ? current : "idle"));

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void saveDiagram();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [currentSignature, diagramId, isLoading, saveDiagram]);

  const handleManualSave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    void saveDiagram();
  }, [saveDiagram]);

  const handleCanvasPlaceNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!isPlaceableNodeTool(activeTool)) {
        return;
      }

      const nodeRecord = createDefaultNodeRecord({
        id: createNodeId(),
        type: activeTool,
        x: position.x,
        y: position.y,
      });

      setNodes((currentNodes) => [
        ...currentNodes,
        ...toFlowNodes([nodeRecord], handleNodeTextChange),
      ]);
      setActiveTool("select");
    },
    [activeTool, handleNodeTextChange, setNodes]
  );

  const handleZoomIn = useCallback(() => {
    void flowInstance?.zoomIn({ duration: 150 });
  }, [flowInstance]);

  const handleZoomOut = useCallback(() => {
    void flowInstance?.zoomOut({ duration: 150 });
  }, [flowInstance]);

  const handleFitView = useCallback(() => {
    void flowInstance?.fitView({ duration: 220, padding: 0.2 });
  }, [flowInstance]);

  return (
    <>
      <main className="h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(46,58,80,0.55),rgba(15,23,42,0.98)_60%)]">
        <div className="flex h-full w-full overflow-hidden border border-[#1f2937] bg-[#060a13] p-1">
          <section className="flex min-h-0 w-full flex-col overflow-hidden bg-[#edf1f4]">
            <EditorTopbar
              title={title}
              onTitleChange={setTitle}
              onSave={handleManualSave}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              isDirty={isDirty}
              onOpenMobileChat={() => setIsMobileChatOpen(true)}
            />
            <div className="flex min-h-0 flex-1 gap-3 p-3 md:gap-4 md:p-5">
              <EditorToolbar activeTool={activeTool} onToolSelect={setActiveTool} />
              <div className="relative min-w-0 flex-1">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white">
                    <Spinner className="size-5 text-zinc-500" />
                  </div>
                ) : (
                  <>
                    <EditorCanvas
                      key={canvasMountKey}
                      nodes={nodes}
                      activeTool={activeTool}
                      showGrid={showGrid}
                      initialViewport={canvasViewport}
                      onNodesChange={onNodesChange}
                      onViewportChange={setViewport}
                      onCanvasPlaceNode={handleCanvasPlaceNode}
                      onReady={setFlowInstance}
                    />
                    <EditorBottomControls
                      zoom={viewport.zoom}
                      gridEnabled={showGrid}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onFitView={handleFitView}
                      onToggleGrid={() => setShowGrid((current) => !current)}
                    />
                  </>
                )}
              </div>
              <aside className="hidden w-[320px] shrink-0 lg:block">
                <EditorChatPanel />
              </aside>
            </div>
          </section>
        </div>
      </main>

      <Sheet open={isMobileChatOpen} onOpenChange={setIsMobileChatOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-sm border-zinc-200 bg-[#edf1f4] p-3">
          <SheetHeader className="px-1 pb-2">
            <SheetTitle>Chat</SheetTitle>
          </SheetHeader>
          <EditorChatPanel className="h-[calc(100vh-7rem)]" />
        </SheetContent>
      </Sheet>
      <Toaster position="top-right" />
    </>
  );
}
