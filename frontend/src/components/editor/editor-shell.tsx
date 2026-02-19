"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng, toSvg } from "html-to-image";
import {
  MarkerType,
  addEdge,
  type Connection,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useEdgesState, useNodesState } from "@xyflow/react";
import { Toaster, toast } from "sonner";
import { EditorBottomControls } from "@/components/editor/editor-bottom-controls";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorChatPanel } from "@/components/editor/editor-chat-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import {
  EditorTopbar,
  type ExportBackground,
  type SaveStatus,
} from "@/components/editor/editor-topbar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DiagramApiError,
  fetchDiagramById,
  fetchLatestDiagram,
  updateDiagram,
  updateDiagramShare,
} from "@/lib/diagram/api";
import {
  createDefaultNodeRecord,
  DEFAULT_GRID_SIZE,
  DEFAULT_SETTINGS,
  DEFAULT_VIEWPORT,
  createEmptyDiagramDocument,
} from "@/lib/diagram/defaults";
import { createHistory, type DiagramSnapshot } from "@/lib/diagram/history";
import {
  createDefaultLayer,
  createDefaultPage,
  ensureLayerSet,
  ensurePageLayerRefs,
  isLayerLocked,
  nextPageName,
  reorderLayers,
  resolveActiveLayerId,
  sortLayers,
  upsertPage,
} from "@/lib/diagram/layers";
import {
  toDiagramPageRecords,
  toFlowEdges,
  toFlowNodes,
  type EditorEdge,
  type EditorNodeData,
} from "@/lib/diagram/mapper";
import { migrateDiagramData } from "@/lib/diagram/migrate";
import { snapNodePosition, snapPosition } from "@/lib/diagram/snap";
import type {
  DiagramEdgeType,
  DiagramLayer,
  DiagramNodeType,
  DiagramPage,
  DiagramViewport,
  EditorTool,
} from "@/lib/diagram/types";

const AUTOSAVE_DELAY_MS = 800;
const EXPORT_PADDING = 48;
const PNG_EXPORT_SCALE = 3;

const createNodeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createLayerName = (count: number) => `Layer ${count + 1}`;

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "diagram";

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

export function EditorShell({
  initialDiagramId = null,
}: {
  initialDiagramId?: string | null;
}) {
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Diagram");
  const [isPublic, setIsPublic] = useState(false);
  const [pages, setPages] = useState<DiagramPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [layers, setLayers] = useState<DiagramLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
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
  const [exportBackground, setExportBackground] =
    useState<ExportBackground>("transparent");
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingSvg, setIsExportingSvg] = useState(false);
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);
  const [isCopyShareSuccess, setIsCopyShareSuccess] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<Node<EditorNodeData>, EditorEdge> | null
  >(null);

  const [nodes, setNodes, rawOnNodesChange] = useNodesState<Node<EditorNodeData>>([]);
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState<EditorEdge>([]);

  const hasHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historiesRef = useRef<Record<string, ReturnType<typeof createHistory>>>({});
  const isDraggingNodeRef = useRef(false);
  const isRestoringHistoryRef = useRef(false);
  const currentSignatureRef = useRef("");
  const lastSavedSignatureRef = useRef<string>("");
  const previousSignatureRef = useRef<string>("");
  const changeVersionRef = useRef(0);
  const emptyDocumentRef = useRef(createEmptyDiagramDocument());
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const snapEnabledRef = useRef(snapEnabled);
  const gridSizeRef = useRef(gridSize);
  const pagesRef = useRef(pages);
  const activePageIdRef = useRef(activePageId);
  const layersRef = useRef(layers);
  const activeLayerIdRef = useRef(activeLayerId);

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

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const showLayerLockedToast = useCallback(() => {
    toast("Layer is locked");
  }, []);

  const getActiveHistory = useCallback((pageId?: string) => {
    const targetPageId = pageId ?? activePageIdRef.current;

    if (!targetPageId) {
      return null;
    }

    return historiesRef.current[targetPageId] ?? null;
  }, []);

  const syncHistoryAvailability = useCallback(
    (pageId?: string) => {
      const history = getActiveHistory(pageId);
      setCanUndo(history?.canUndo() ?? false);
      setCanRedo(history?.canRedo() ?? false);
    },
    [getActiveHistory]
  );

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
      if (!hasHydratedRef.current || isRestoringHistoryRef.current) {
        return;
      }

      const history = getActiveHistory();

      if (!history) {
        return;
      }

      history.push(buildSnapshot(overrides));
      syncHistoryAvailability();
    },
    [buildSnapshot, getActiveHistory, syncHistoryAvailability]
  );

  const handleNodeTextChange = useCallback(
    (nodeId: string, nextText: string) => {
      const targetNode = nodesRef.current.find((node) => node.id === nodeId);

      if (!targetNode) {
        return;
      }

      if (isLayerLocked(layersRef.current, targetNode.data.layerId)) {
        showLayerLockedToast();
        return;
      }

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
    },
    [pushHistorySnapshot, setNodes, showLayerLockedToast]
  );

  const createPageSnapshot = useCallback(
    (page: DiagramPage): DiagramSnapshot => {
      const normalizedPage = ensurePageLayerRefs(page);

      return {
        nodes: toFlowNodes(
          normalizedPage.nodes,
          handleNodeTextChange,
          showLayerLockedToast
        ),
        edges: toFlowEdges(normalizedPage.edges),
        viewport: normalizedPage.viewport,
        settings: normalizedPage.settings,
      };
    },
    [handleNodeTextChange, showLayerLockedToast]
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
    const snapshot = getActiveHistory()?.undo();

    if (!snapshot) {
      return;
    }

    applyHistorySnapshot(snapshot);
    syncHistoryAvailability();
  }, [applyHistorySnapshot, getActiveHistory, syncHistoryAvailability]);

  const handleRedo = useCallback(() => {
    const snapshot = getActiveHistory()?.redo();

    if (!snapshot) {
      return;
    }

    applyHistorySnapshot(snapshot);
    syncHistoryAvailability();
  }, [applyHistorySnapshot, getActiveHistory, syncHistoryAvailability]);

  const hydratePage = useCallback(
    (page: DiagramPage) => {
      const normalizedPage = ensurePageLayerRefs(page);
      const flowNodes = toFlowNodes(
        normalizedPage.nodes,
        handleNodeTextChange,
        showLayerLockedToast
      );
      const flowEdges = toFlowEdges(normalizedPage.edges);
      const sortedLayers = sortLayers(normalizedPage.layers);
      const resolvedActiveLayerId = resolveActiveLayerId(
        sortedLayers,
        normalizedPage.activeLayerId
      );

      setNodes(flowNodes);
      setEdges(flowEdges);
      setViewport(normalizedPage.viewport);
      setCanvasViewport(normalizedPage.viewport);
      setSnapEnabled(normalizedPage.settings.snapEnabled);
      setGridSize(normalizedPage.settings.gridSize);
      setLayers(sortedLayers);
      setActiveLayerId(resolvedActiveLayerId);
      setDefaultEdgeType(
        flowEdges.find((edge) => edge.type === "straight")?.type === "straight"
          ? "straight"
          : "smoothstep"
      );
    },
    [handleNodeTextChange, setEdges, setNodes, showLayerLockedToast]
  );

  const buildRuntimePage = useCallback((basePage: DiagramPage): DiagramPage => {
    const normalizedLayers = ensureLayerSet(layersRef.current);
    const fallbackLayerId = normalizedLayers[0].id;
    const { nodes: pageNodes, edges: pageEdges } = toDiagramPageRecords(
      nodesRef.current,
      edgesRef.current,
      fallbackLayerId
    );

    return ensurePageLayerRefs({
      ...basePage,
      viewport: { ...viewportRef.current },
      settings: {
        snapEnabled: snapEnabledRef.current,
        gridSize: gridSizeRef.current,
      },
      layers: normalizedLayers,
      activeLayerId: resolveActiveLayerId(
        normalizedLayers,
        activeLayerIdRef.current ?? fallbackLayerId
      ),
      nodes: pageNodes,
      edges: pageEdges,
    });
  }, []);

  const commitCurrentRuntimeToPages = useCallback(
    (basePages: DiagramPage[]) => {
      const currentPageId = activePageIdRef.current;

      if (!currentPageId) {
        return basePages;
      }

      const basePage = basePages.find((page) => page.id === currentPageId);

      if (!basePage) {
        return basePages;
      }

      return upsertPage(basePages, buildRuntimePage(basePage));
    },
    [buildRuntimePage]
  );

  useEffect(() => {
    let isCancelled = false;

    const loadDiagram = async () => {
      try {
        let diagram;

        if (initialDiagramId) {
          try {
            diagram = await fetchDiagramById(initialDiagramId);
          } catch (error) {
            if (error instanceof DiagramApiError && error.status === 404) {
              toast.error("Requested diagram was not found. Loading your latest diagram instead.");
              diagram = await fetchLatestDiagram();
            } else {
              throw error;
            }
          }
        } else {
          diagram = await fetchLatestDiagram();
        }

        if (isCancelled) {
          return;
        }

        const migrated = migrateDiagramData(diagram.data);
        const normalizedPages = migrated.pages.map((page) => ensurePageLayerRefs(page));
        const resolvedActivePageId = normalizedPages.some(
          (page) => page.id === migrated.activePageId
        )
          ? migrated.activePageId
          : normalizedPages[0].id;
        const activePage =
          normalizedPages.find((page) => page.id === resolvedActivePageId) ?? normalizedPages[0];
        const loadedTitle = diagram.title.trim().length > 0 ? diagram.title : "Untitled Diagram";

        setDiagramId(diagram.id);
        setTitle(loadedTitle);
        setIsPublic(diagram.isPublic);
        setPages(normalizedPages);
        setActivePageId(resolvedActivePageId);
        hydratePage(activePage);
        setCanvasMountKey((previous) => previous + 1);
        setLastSavedAt(diagram.updatedAt);
        setSaveStatus("saved");

        const nextHistories: Record<string, ReturnType<typeof createHistory>> = {};
        normalizedPages.forEach((page) => {
          nextHistories[page.id] = createHistory(createPageSnapshot(page));
        });
        historiesRef.current = nextHistories;
        syncHistoryAvailability(resolvedActivePageId);

        const loadedData = {
          dataVersion: 2 as const,
          activePageId: resolvedActivePageId,
          pages: normalizedPages,
        };

        lastSavedSignatureRef.current = JSON.stringify({
          title: loadedTitle,
          data: loadedData,
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
  }, [createPageSnapshot, hydratePage, initialDiagramId, syncHistoryAvailability]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const layerOrderMap = useMemo(
    () => new Map(sortLayers(layers).map((layer) => [layer.id, layer.order])),
    [layers]
  );
  const hiddenLayerIds = useMemo(
    () => new Set(layers.filter((layer) => !layer.isVisible).map((layer) => layer.id)),
    [layers]
  );

  const visibleNodes = useMemo(() => {
    return nodes
      .filter((node) => !hiddenLayerIds.has(node.data.layerId))
      .map((node) => {
        const locked = isLayerLocked(layers, node.data.layerId);
        const layerOrder = layerOrderMap.get(node.data.layerId) ?? 0;

        return {
          ...node,
          data: {
            ...node.data,
            isLocked: locked,
            onLockedInteraction: showLayerLockedToast,
          },
          draggable: !locked,
          selectable: !locked,
          connectable: !locked,
          zIndex: (layerOrder + 1) * 10,
        };
      });
  }, [hiddenLayerIds, layerOrderMap, layers, nodes, showLayerLockedToast]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    return edges
      .filter(
        (edge) =>
          !hiddenLayerIds.has(edge.layerId) &&
          visibleNodeIds.has(edge.source) &&
          visibleNodeIds.has(edge.target)
      )
      .map((edge) => {
        const layerOrder = layerOrderMap.get(edge.layerId) ?? 0;

        return {
          ...edge,
          markerEnd: { type: MarkerType.ArrowClosed },
          zIndex: (layerOrder + 1) * 10 - 1,
        };
      });
  }, [edges, hiddenLayerIds, layerOrderMap, visibleNodeIds]);

  const normalizedTitle = title.trim() || "Untitled Diagram";

  const activePageName = useMemo(
    () => pages.find((page) => page.id === activePageId)?.name ?? "Page 1",
    [activePageId, pages]
  );

  const shareUrl = useMemo(() => {
    if (!diagramId || !activePageId) {
      return null;
    }

    if (typeof window === "undefined") {
      return `/d/${diagramId}/p/${activePageId}`;
    }

    return new URL(`/d/${diagramId}/p/${activePageId}`, window.location.origin).toString();
  }, [activePageId, diagramId]);

  const exportBounds = useMemo(() => {
    if (visibleNodes.length === 0) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    visibleNodes.forEach((node) => {
      const width = node.data.size.width;
      const height = node.data.size.height;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    });

    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }, [visibleNodes]);

  const downloadFromDataUrl = useCallback((dataUrl: string, extension: "png" | "svg") => {
    const anchor = document.createElement("a");
    const fileBase = sanitizeFileName(`${normalizedTitle}-${activePageName}`);

    anchor.href = dataUrl;
    anchor.download = `${fileBase}.${extension}`;
    anchor.rel = "noopener";
    anchor.click();
  }, [activePageName, normalizedTitle]);

  const buildExportOptions = useCallback(() => {
    if (!exportBounds) {
      return null;
    }

    const width = Math.ceil(exportBounds.width + EXPORT_PADDING * 2);
    const height = Math.ceil(exportBounds.height + EXPORT_PADDING * 2);

    return {
      width,
      height,
      backgroundColor: exportBackground === "white" ? "#ffffff" : undefined,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${EXPORT_PADDING - exportBounds.x}px, ${
          EXPORT_PADDING - exportBounds.y
        }px)`,
      },
    };
  }, [exportBackground, exportBounds]);

  const getViewportElement = useCallback(() => {
    return document.querySelector(".react-flow__viewport") as HTMLElement | null;
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!exportBounds) {
      toast.error("Nothing visible to export on this page.");
      return;
    }

    const viewportElement = getViewportElement();
    const options = buildExportOptions();

    if (!viewportElement || !options) {
      toast.error("Canvas export is unavailable right now.");
      return;
    }

    setIsExportingPng(true);

    try {
      const dataUrl = await toPng(viewportElement, {
        ...options,
        pixelRatio: PNG_EXPORT_SCALE,
        cacheBust: true,
      });
      downloadFromDataUrl(dataUrl, "png");
      toast.success("PNG exported.");
    } catch {
      toast.error("Failed to export PNG.");
    } finally {
      setIsExportingPng(false);
    }
  }, [buildExportOptions, downloadFromDataUrl, exportBounds, getViewportElement]);

  const handleExportSvg = useCallback(async () => {
    if (!exportBounds) {
      toast.error("Nothing visible to export on this page.");
      return;
    }

    const viewportElement = getViewportElement();
    const options = buildExportOptions();

    if (!viewportElement || !options) {
      toast.error("Canvas export is unavailable right now.");
      return;
    }

    setIsExportingSvg(true);

    try {
      const dataUrl = await toSvg(viewportElement, {
        ...options,
        cacheBust: true,
      });
      downloadFromDataUrl(dataUrl, "svg");
      toast.success("SVG exported.");
    } catch {
      toast.error("Failed to export SVG.");
    } finally {
      setIsExportingSvg(false);
    }
  }, [buildExportOptions, downloadFromDataUrl, exportBounds, getViewportElement]);

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopyShareSuccess(true);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => {
        setIsCopyShareSuccess(false);
      }, 1500);
      toast.success("Share link copied.");
    } catch {
      toast.error("Failed to copy link.");
    }
  }, [shareUrl]);

  const handleToggleShare = useCallback(
    async (nextIsPublic: boolean) => {
      if (!diagramId) {
        return;
      }

      setIsUpdatingShare(true);

      try {
        const updated = await updateDiagramShare({ diagramId, isPublic: nextIsPublic });
        setIsPublic(updated.isPublic);
        toast.success(updated.isPublic ? "Public link enabled." : "Public link disabled.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update sharing.");
      } finally {
        setIsUpdatingShare(false);
      }
    },
    [diagramId]
  );

  const diagramDocument = useMemo(() => {
    if (!activePageId || pages.length === 0) {
      return emptyDocumentRef.current;
    }

    const normalizedLayers = ensureLayerSet(layers);
    const fallbackLayerId = normalizedLayers[0].id;
    const resolvedLayerId = resolveActiveLayerId(
      normalizedLayers,
      activeLayerId ?? fallbackLayerId
    );
    const { nodes: pageNodes, edges: pageEdges } = toDiagramPageRecords(
      nodes,
      edges,
      fallbackLayerId
    );
    const activePage = ensurePageLayerRefs({
      id: activePageId,
      name: activePageName,
      viewport,
      settings: {
        snapEnabled,
        gridSize,
      },
      layers: normalizedLayers,
      activeLayerId: resolvedLayerId,
      nodes: pageNodes,
      edges: pageEdges,
    });

    const mergedPages = upsertPage(pages, activePage).map((page) => ensurePageLayerRefs(page));

    return {
      dataVersion: 2 as const,
      activePageId,
      pages: mergedPages,
    };
  }, [
    activeLayerId,
    activePageId,
    activePageName,
    edges,
    gridSize,
    layers,
    nodes,
    pages,
    snapEnabled,
    viewport,
  ]);

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
      setIsPublic(updated.isPublic);
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

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<EditorNodeData>>[]) => {
      const lockedLayerIds = new Set(
        layersRef.current.filter((layer) => layer.isLocked).map((layer) => layer.id)
      );
      let blocked = false;
      const filtered = changes.filter((change) => {
        if (
          change.type !== "position" &&
          change.type !== "remove" &&
          change.type !== "select"
        ) {
          return true;
        }

        const node = nodesRef.current.find((entry) => entry.id === change.id);

        if (!node) {
          return true;
        }

        if (!lockedLayerIds.has(node.data.layerId)) {
          return true;
        }

        blocked = true;
        return false;
      });

      if (blocked) {
        showLayerLockedToast();
      }

      rawOnNodesChange(filtered);
    },
    [rawOnNodesChange, showLayerLockedToast]
  );

  const handlePageSwitch = useCallback(
    (nextPageId: string) => {
      const currentPageId = activePageIdRef.current;

      if (!nextPageId || !currentPageId || nextPageId === currentPageId) {
        return;
      }

      const committedPages = commitCurrentRuntimeToPages(pagesRef.current);
      const nextPage = committedPages.find((page) => page.id === nextPageId);

      if (!nextPage) {
        return;
      }

      setPages(committedPages);
      setActivePageId(nextPageId);
      activePageIdRef.current = nextPageId;
      setActiveTool("select");
      hydratePage(nextPage);
      setCanvasMountKey((previous) => previous + 1);

      if (!historiesRef.current[nextPageId]) {
        historiesRef.current[nextPageId] = createHistory(createPageSnapshot(nextPage));
      }

      syncHistoryAvailability(nextPageId);
    },
    [commitCurrentRuntimeToPages, createPageSnapshot, hydratePage, syncHistoryAvailability]
  );

  const handleAddPage = useCallback(() => {
    const committedPages = commitCurrentRuntimeToPages(pagesRef.current);
    const page = createDefaultPage({
      name: nextPageName(committedPages),
      settings: {
        snapEnabled: snapEnabledRef.current,
        gridSize: gridSizeRef.current,
      },
      viewport: { ...DEFAULT_VIEWPORT },
    });
    const nextPages = [...committedPages, page];

    setPages(nextPages);
    setActivePageId(page.id);
    activePageIdRef.current = page.id;
    setActiveTool("select");
    hydratePage(page);
    setCanvasMountKey((previous) => previous + 1);

    historiesRef.current[page.id] = createHistory(createPageSnapshot(page));
    syncHistoryAvailability(page.id);
  }, [commitCurrentRuntimeToPages, createPageSnapshot, hydratePage, syncHistoryAvailability]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const sourceNode = nodesRef.current.find((node) => node.id === connection.source);
      const targetNode = nodesRef.current.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return;
      }

      const edgeLayerId = activeLayerIdRef.current ?? sourceNode.data.layerId;

      if (
        isLayerLocked(layersRef.current, sourceNode.data.layerId) ||
        isLayerLocked(layersRef.current, targetNode.data.layerId) ||
        isLayerLocked(layersRef.current, edgeLayerId)
      ) {
        showLayerLockedToast();
        return;
      }

      setEdges((currentEdges) => {
        const nextEdges = addEdge(
          {
            ...connection,
            type: defaultEdgeType,
            markerEnd: { type: MarkerType.ArrowClosed },
            layerId: edgeLayerId,
          },
          currentEdges
        ) as EditorEdge[];

        pushHistorySnapshot({ edges: nextEdges });

        return nextEdges;
      });
    },
    [defaultEdgeType, pushHistorySnapshot, setEdges, showLayerLockedToast]
  );

  const handleCanvasPlaceNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!isPlaceableNodeTool(activeTool)) {
        return;
      }

      const normalizedLayers = ensureLayerSet(layersRef.current);
      const fallbackLayerId = normalizedLayers[0].id;
      const targetLayerId = resolveActiveLayerId(
        normalizedLayers,
        activeLayerIdRef.current ?? fallbackLayerId
      );

      if (isLayerLocked(normalizedLayers, targetLayerId)) {
        showLayerLockedToast();
        return;
      }

      const nextPosition = snapEnabled ? snapPosition(position, gridSize) : position;
      const nodeRecord = createDefaultNodeRecord({
        id: createNodeId(),
        type: activeTool,
        x: nextPosition.x,
        y: nextPosition.y,
        layerId: targetLayerId,
      });

      setNodes((currentNodes) => {
        const nextNodes = [
          ...currentNodes,
          ...toFlowNodes([nodeRecord], handleNodeTextChange, showLayerLockedToast),
        ];

        pushHistorySnapshot({ nodes: nextNodes });

        return nextNodes;
      });
      setActiveTool("select");
    },
    [
      activeTool,
      gridSize,
      handleNodeTextChange,
      pushHistorySnapshot,
      setNodes,
      showLayerLockedToast,
      snapEnabled,
    ]
  );

  const handleNodeDragStart = useCallback(() => {
    isDraggingNodeRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback(
    (node: Node<EditorNodeData>) => {
      isDraggingNodeRef.current = false;

      if (isLayerLocked(layersRef.current, node.data.layerId)) {
        showLayerLockedToast();
        return;
      }

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
    [pushHistorySnapshot, setNodes, showLayerLockedToast]
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

  const handleAddLayer = useCallback(() => {
    setLayers((currentLayers) => {
      const normalized = ensureLayerSet(currentLayers);
      const nextLayer = createDefaultLayer(
        normalized.length,
        createLayerName(normalized.length)
      );
      const nextLayers = [...normalized, nextLayer];
      setActiveLayerId(nextLayer.id);
      return nextLayers;
    });
  }, []);

  const handleSelectLayer = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
  }, []);

  const handleRenameLayer = useCallback((layerId: string, name: string) => {
    setLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              name: name.trim().length > 0 ? name : "Layer",
            }
          : layer
      )
    );
  }, []);

  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              isVisible: !layer.isVisible,
            }
          : layer
      )
    );
  }, []);

  const handleToggleLayerLock = useCallback((layerId: string) => {
    setLayers((currentLayers) =>
      currentLayers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              isLocked: !layer.isLocked,
            }
          : layer
      )
    );
  }, []);

  const handleMoveLayer = useCallback((layerId: string, direction: "up" | "down") => {
    setLayers((currentLayers) => reorderLayers(currentLayers, layerId, direction));
  }, []);

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
              pages={pages.map((page) => ({ id: page.id, name: page.name }))}
              activePageId={activePageId}
              onPageChange={handlePageSwitch}
              onAddPage={handleAddPage}
              isPageDisabled={isLoading}
              onOpenMobileChat={() => setIsMobileChatOpen(true)}
              onExportPng={handleExportPng}
              onExportSvg={handleExportSvg}
              exportBackground={exportBackground}
              onExportBackgroundChange={setExportBackground}
              isExportingPng={isExportingPng}
              isExportingSvg={isExportingSvg}
              shareUrl={shareUrl}
              isPublic={isPublic}
              isUpdatingShare={isUpdatingShare}
              onToggleShare={handleToggleShare}
              onCopyShareUrl={handleCopyShareUrl}
              isCopyShareSuccess={isCopyShareSuccess}
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
                      nodes={visibleNodes}
                      edges={visibleEdges}
                      activeTool={activeTool}
                      gridVisible={gridVisible}
                      snapEnabled={snapEnabled}
                      gridSize={gridSize}
                      defaultEdgeType={defaultEdgeType}
                      initialViewport={canvasViewport}
                      onNodesChange={handleNodesChange}
                      onEdgesChange={rawOnEdgesChange}
                      onConnect={handleConnect}
                      onViewportChange={setViewport}
                      onCanvasPlaceNode={handleCanvasPlaceNode}
                      onNodeDragStart={handleNodeDragStart}
                      onNodeDragStop={handleNodeDragStop}
                      onReady={setFlowInstance}
                      onLockedNodeInteraction={showLayerLockedToast}
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
                <Tabs defaultValue="chat" className="h-full">
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-100">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="layers">Layers</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="h-[calc(100%-2.5rem)]">
                    <EditorChatPanel className="h-full" />
                  </TabsContent>
                  <TabsContent value="layers" className="h-[calc(100%-2.5rem)]">
                    <LayersPanel
                      layers={layers}
                      activeLayerId={activeLayerId}
                      onSelectLayer={handleSelectLayer}
                      onRenameLayer={handleRenameLayer}
                      onToggleVisibility={handleToggleLayerVisibility}
                      onToggleLock={handleToggleLayerLock}
                      onMoveLayer={handleMoveLayer}
                      onAddLayer={handleAddLayer}
                    />
                  </TabsContent>
                </Tabs>
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
