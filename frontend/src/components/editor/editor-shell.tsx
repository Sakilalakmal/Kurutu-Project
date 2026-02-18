"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MarkerType,
  addEdge,
  type Connection,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useEdgesState, useNodesState } from "@xyflow/react";
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
import {
  createDefaultNodeRecord,
  DEFAULT_GRID_SIZE,
  DEFAULT_SETTINGS,
  DEFAULT_VIEWPORT,
} from "@/lib/diagram/defaults";
import { createHistory, type DiagramSnapshot } from "@/lib/diagram/history";
import {
  toDiagramDocument,
  toFlowEdges,
  toFlowNodes,
  type EditorEdge,
  type EditorNodeData,
} from "@/lib/diagram/mapper";
import { snapNodePosition, snapPosition } from "@/lib/diagram/snap";
import type {
  DiagramEdgeType,
  DiagramNodeType,
  DiagramSettings,
  DiagramViewport,
  EditorTool,
} from "@/lib/diagram/types";

const AUTOSAVE_DELAY_MS = 800;

const createNodeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isPlaceableNodeTool = (tool: EditorTool): tool is DiagramNodeType =>
  tool === "rectangle" || tool === "ellipse" || tool === "sticky";

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable ||
    target.closest("[contenteditable='true']") !== null
  );
};

export function EditorShell() {
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Diagram");
  const [viewport, setViewport] = useState<DiagramViewport>(DEFAULT_VIEWPORT);
  const [canvasViewport, setCanvasViewport] = useState<DiagramViewport>(DEFAULT_VIEWPORT);
  const [canvasMountKey, setCanvasMountKey] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(DEFAULT_SETTINGS.snapEnabled);
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [defaultEdgeType, setDefaultEdgeType] = useState<DiagramEdgeType>("smoothstep");
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, EditorEdge> | null
  >(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EditorNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EditorEdge>([]);

  const hasHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<ReturnType<typeof createHistory> | null>(null);
  const isDraggingNodeRef = useRef(false);
  const isRestoringHistoryRef = useRef(false);
  const currentSignatureRef = useRef("");
  const lastSavedSignatureRef = useRef<string>("");
  const previousSignatureRef = useRef<string>("");
  const changeVersionRef = useRef(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const snapEnabledRef = useRef(snapEnabled);
  const gridSizeRef = useRef(gridSize);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);

  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);

  const syncHistoryAvailability = useCallback(() => {
    setCanUndo(historyRef.current?.canUndo() ?? false);
    setCanRedo(historyRef.current?.canRedo() ?? false);
  }, []);

  const buildSnapshot = useCallback(
    (overrides?: Partial<DiagramSnapshot>): DiagramSnapshot => ({
      nodes: overrides?.nodes ?? nodesRef.current,
      edges: overrides?.edges ?? edgesRef.current,
      viewport: overrides?.viewport ?? viewportRef.current,
      settings:
        overrides?.settings ?? {
          snapEnabled: snapEnabledRef.current,
          gridSize: gridSizeRef.current,
        },
    }),
    []
  );

  const pushHistorySnapshot = useCallback(
    (overrides?: Partial<DiagramSnapshot>) => {
      if (!hasHydratedRef.current || isRestoringHistoryRef.current || !historyRef.current) {
        return;
      }

      historyRef.current.push(buildSnapshot(overrides));
      syncHistoryAvailability();
    },
    [buildSnapshot, syncHistoryAvailability]
  );

  const applyHistorySnapshot = useCallback(
    (snapshot: DiagramSnapshot) => {
      isRestoringHistoryRef.current = true;

      const normalizedEdges = snapshot.edges.map((edge) => ({
        ...edge,
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

      setNodes(snapshot.nodes);
      setEdges(normalizedEdges);
      setViewport(snapshot.viewport);
      setCanvasViewport(snapshot.viewport);
      setSnapEnabled(snapshot.settings.snapEnabled);
      setGridSize(snapshot.settings.gridSize);
      void flowInstance?.setViewport(snapshot.viewport, { duration: 0 });

      Promise.resolve().then(() => {
        isRestoringHistoryRef.current = false;
      });
    },
    [flowInstance, setEdges, setNodes]
  );

  const handleUndo = useCallback(() => {
    const snapshot = historyRef.current?.undo();

    if (!snapshot) {
      return;
    }

    applyHistorySnapshot(snapshot);
    syncHistoryAvailability();
  }, [applyHistorySnapshot, syncHistoryAvailability]);

  const handleRedo = useCallback(() => {
    const snapshot = historyRef.current?.redo();

    if (!snapshot) {
      return;
    }

    applyHistorySnapshot(snapshot);
    syncHistoryAvailability();
  }, [applyHistorySnapshot, syncHistoryAvailability]);

  const handleNodeTextChange = useCallback((nodeId: string, nextText: string) => {
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) =>
        node.id === nodeId && node.data.text !== nextText
          ? {
              ...node,
              data: {
                ...node.data,
                text: nextText,
              },
            }
          : node
      );

      pushHistorySnapshot({ nodes: updatedNodes });

      return updatedNodes;
    });
  }, [pushHistorySnapshot, setNodes]);

  useEffect(() => {
    let isCancelled = false;

    const loadDiagram = async () => {
      try {
        const diagram = await fetchLatestDiagram();

        if (isCancelled) {
          return;
        }

        const loadedNodes = toFlowNodes(diagram.data.nodes, handleNodeTextChange);
        const loadedEdges = toFlowEdges(diagram.data.edges ?? []);
        const loadedViewport = diagram.data.viewport ?? DEFAULT_VIEWPORT;
        const loadedSettings: DiagramSettings = {
          snapEnabled: diagram.data.settings?.snapEnabled ?? DEFAULT_SETTINGS.snapEnabled,
          gridSize: diagram.data.settings?.gridSize ?? DEFAULT_GRID_SIZE,
        };
        const loadedTitle = diagram.title.trim().length > 0 ? diagram.title : "Untitled Diagram";

        setDiagramId(diagram.id);
        setTitle(loadedTitle);
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setViewport(loadedViewport);
        setCanvasViewport(loadedViewport);
        setSnapEnabled(loadedSettings.snapEnabled);
        setGridSize(loadedSettings.gridSize);

        const firstEdgeType = loadedEdges.find((edge) => edge.type === "straight")?.type;
        setDefaultEdgeType(firstEdgeType === "straight" ? "straight" : "smoothstep");

        setCanvasMountKey((previous) => previous + 1);
        setLastSavedAt(diagram.updatedAt);
        setSaveStatus("saved");

        historyRef.current = createHistory({
          nodes: loadedNodes,
          edges: loadedEdges,
          viewport: loadedViewport,
          settings: loadedSettings,
        });
        syncHistoryAvailability();

        lastSavedSignatureRef.current = JSON.stringify({
          title: loadedTitle,
          data: {
            ...diagram.data,
            edges: diagram.data.edges ?? [],
            settings: loadedSettings,
          },
        });
        currentSignatureRef.current = lastSavedSignatureRef.current;
        previousSignatureRef.current = lastSavedSignatureRef.current;
        changeVersionRef.current = 0;
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
  }, [handleNodeTextChange, setEdges, setNodes, syncHistoryAvailability]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const normalizedTitle = title.trim() || "Untitled Diagram";
  const diagramDocument = useMemo(
    () =>
      toDiagramDocument(nodes, edges, viewport, {
        snapEnabled,
        gridSize,
      }),
    [nodes, edges, viewport, snapEnabled, gridSize]
  );
  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        title: normalizedTitle,
        data: diagramDocument,
      }),
    [diagramDocument, normalizedTitle]
  );
  const isDirty = currentSignature !== lastSavedSignatureRef.current;

  useEffect(() => {
    const previous = previousSignatureRef.current;
    previousSignatureRef.current = currentSignature;
    currentSignatureRef.current = currentSignature;

    if (!hasHydratedRef.current) {
      return;
    }

    if (previous && previous !== currentSignature) {
      changeVersionRef.current += 1;
    }
  }, [currentSignature]);

  const saveDiagram = useCallback(async () => {
    if (!diagramId) {
      return;
    }

    if (currentSignature === lastSavedSignatureRef.current) {
      setSaveStatus("saved");
      return;
    }

    const requestVersion = changeVersionRef.current;
    const requestSignature = currentSignature;

    setSaveStatus("saving");

    try {
      const updated = await updateDiagram({
        diagramId,
        payload: {
          title: normalizedTitle,
          data: diagramDocument,
        },
      });

      if (
        requestVersion !== changeVersionRef.current ||
        requestSignature !== currentSignatureRef.current
      ) {
        setSaveStatus("idle");
        return;
      }

      lastSavedSignatureRef.current = requestSignature;
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

    if (isDraggingNodeRef.current) {
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

  const handleDeleteSelection = useCallback(() => {
    const selectedNodeIds = new Set(
      nodesRef.current.filter((node) => node.selected).map((node) => node.id)
    );

    const nextNodes =
      selectedNodeIds.size > 0
        ? nodesRef.current.filter((node) => !selectedNodeIds.has(node.id))
        : nodesRef.current;

    const nextEdges = edgesRef.current.filter(
      (edge) =>
        !edge.selected &&
        !selectedNodeIds.has(edge.source) &&
        !selectedNodeIds.has(edge.target)
    );

    if (
      nextNodes.length === nodesRef.current.length &&
      nextEdges.length === edgesRef.current.length
    ) {
      return;
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    pushHistorySnapshot({
      nodes: nextNodes,
      edges: nextEdges,
    });
  }, [pushHistorySnapshot, setEdges, setNodes]);

  const handleClearSelection = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.selected ? { ...node, selected: false } : node))
    );
    setEdges((currentEdges) =>
      currentEdges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge))
    );
  }, [setEdges, setNodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const commandPressed = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const editable = isEditableTarget(event.target);

      if (commandPressed && key === "z") {
        if (editable) {
          return;
        }

        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      if (commandPressed && key === "y") {
        if (editable) {
          return;
        }

        event.preventDefault();
        handleRedo();
        return;
      }

      if (editable) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClearSelection, handleDeleteSelection, handleRedo, handleUndo]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => {
        const nextEdges = addEdge(
          {
            ...connection,
            type: defaultEdgeType,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges
        );

        pushHistorySnapshot({ edges: nextEdges });

        return nextEdges;
      });
    },
    [defaultEdgeType, pushHistorySnapshot, setEdges]
  );

  const handleCanvasPlaceNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!isPlaceableNodeTool(activeTool)) {
        return;
      }

      const nextPosition = snapEnabled ? snapPosition(position, gridSize) : position;
      const nodeRecord = createDefaultNodeRecord({
        id: createNodeId(),
        type: activeTool,
        x: nextPosition.x,
        y: nextPosition.y,
      });

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes, ...toFlowNodes([nodeRecord], handleNodeTextChange)];

        pushHistorySnapshot({ nodes: nextNodes });

        return nextNodes;
      });
      setActiveTool("select");
    },
    [activeTool, gridSize, handleNodeTextChange, pushHistorySnapshot, setNodes, snapEnabled]
  );

  const handleNodeDragStart = useCallback(() => {
    isDraggingNodeRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback(
    (node: Node<EditorNodeData>) => {
      isDraggingNodeRef.current = false;

      if (snapEnabledRef.current) {
        setNodes((currentNodes) => {
          const nextNodes = currentNodes.map((entry) =>
            entry.id === node.id ? snapNodePosition(entry, gridSizeRef.current) : entry
          );

          pushHistorySnapshot({ nodes: nextNodes });

          return nextNodes;
        });
        return;
      }

      pushHistorySnapshot();
    },
    [pushHistorySnapshot, setNodes]
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
                      edges={edges}
                      activeTool={activeTool}
                      gridVisible={gridVisible}
                      snapEnabled={snapEnabled}
                      gridSize={gridSize}
                      defaultEdgeType={defaultEdgeType}
                      initialViewport={canvasViewport}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={handleConnect}
                      onViewportChange={setViewport}
                      onCanvasPlaceNode={handleCanvasPlaceNode}
                      onNodeDragStart={handleNodeDragStart}
                      onNodeDragStop={handleNodeDragStop}
                      onReady={setFlowInstance}
                    />
                    <EditorBottomControls
                      zoom={viewport.zoom}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      gridVisible={gridVisible}
                      snapEnabled={snapEnabled}
                      defaultEdgeType={defaultEdgeType}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onFitView={handleFitView}
                      onToggleGridVisible={() => setGridVisible((current) => !current)}
                      onToggleSnap={() => {
                        setSnapEnabled((current) => {
                          const nextSnapEnabled = !current;

                          pushHistorySnapshot({
                            settings: {
                              snapEnabled: nextSnapEnabled,
                              gridSize: gridSizeRef.current,
                            },
                          });

                          return nextSnapEnabled;
                        });
                      }}
                      onToggleEdgeType={() =>
                        setDefaultEdgeType((current) =>
                          current === "smoothstep" ? "straight" : "smoothstep"
                        )
                      }
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
