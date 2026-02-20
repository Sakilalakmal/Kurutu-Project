"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MarkerType, type Node } from "@xyflow/react";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { applyEdgeStyle } from "@/lib/diagram/edges";
import {
  DiagramApiError,
  fetchDiagramPageForViewer,
} from "@/lib/diagram/api";
import { isLayerLocked, sortLayers } from "@/lib/diagram/layers";
import { toFlowEdges, toFlowNodes, type EditorEdge, type EditorNodeData } from "@/lib/diagram/mapper";
import type { DiagramPage, DiagramStroke, DiagramViewport } from "@/lib/diagram/types";

type ViewerShellProps = {
  diagramId: string;
  pageId: string;
};

const EMPTY_VIEWPORT: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

const createLoginUrl = () => {
  if (typeof window === "undefined") {
    return "/login";
  }

  const callbackUrl = `${window.location.pathname}${window.location.search}`;

  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
};

const ViewerHeader = ({
  title,
  diagramId,
  isOwner,
}: {
  title: string;
  diagramId: string;
  isOwner: boolean;
}) => (
  <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur sm:px-6">
    <h1 className="truncate text-sm font-semibold text-zinc-900 sm:text-base">{title}</h1>
    {isOwner ? (
      <Button asChild size="sm" variant="outline">
        <Link href={`/editor?diagramId=${diagramId}`}>Open in editor</Link>
      </Button>
    ) : null}
  </header>
);

export function ViewerShell({ diagramId, pageId }: ViewerShellProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("Diagram");
  const [isOwner, setIsOwner] = useState(false);
  const [page, setPage] = useState<DiagramPage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<DiagramViewport>(EMPTY_VIEWPORT);

  useEffect(() => {
    let cancelled = false;

    const loadViewer = async () => {
      try {
        const response = await fetchDiagramPageForViewer({ diagramId, pageId });

        if (cancelled) {
          return;
        }

        setTitle(response.title);
        setIsOwner(response.isOwner);
        setPage(response.page);
        setViewport(response.page.viewport);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof DiagramApiError && error.status === 401) {
          window.location.replace(createLoginUrl());
          return;
        }

        if (error instanceof DiagramApiError && error.status === 403) {
          setErrorMessage("This diagram is private and you do not have access.");
          return;
        }

        if (error instanceof DiagramApiError && error.status === 404) {
          setErrorMessage("This shared diagram page was not found.");
          return;
        }

        setErrorMessage("Unable to load shared diagram.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [diagramId, pageId]);

  const visibleNodes = useMemo(() => {
    if (!page) {
      return [] as Node<EditorNodeData>[];
    }

    const sortedLayers = sortLayers(page.layers);
    const hiddenLayerIds = new Set(
      sortedLayers.filter((layer) => !layer.isVisible).map((layer) => layer.id)
    );
    const layerOrderMap = new Map(sortedLayers.map((layer) => [layer.id, layer.order]));

    return toFlowNodes(page.nodes, () => undefined, () => undefined, {
      readOnly: true,
    })
      .filter((node) => !hiddenLayerIds.has(node.data.layerId))
      .map((node) => {
        const locked = isLayerLocked(sortedLayers, node.data.layerId);
        const layerOrder = layerOrderMap.get(node.data.layerId) ?? 0;

        return {
          ...node,
          data: {
            ...node.data,
            isLocked: locked,
            isReadOnly: true,
            onTextChange: () => undefined,
            onLockedInteraction: () => undefined,
          },
          draggable: false,
          selectable: false,
          connectable: false,
          zIndex: (layerOrder + 1) * 10,
        };
      });
  }, [page]);

  const visibleEdges = useMemo(() => {
    if (!page) {
      return [] as EditorEdge[];
    }

    const sortedLayers = sortLayers(page.layers);
    const hiddenLayerIds = new Set(
      sortedLayers.filter((layer) => !layer.isVisible).map((layer) => layer.id)
    );
    const layerOrderMap = new Map(sortedLayers.map((layer) => [layer.id, layer.order]));
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    return toFlowEdges(page.edges)
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
  }, [page, visibleNodes]);

  const visibleStrokes = useMemo(() => {
    if (!page) {
      return [] as DiagramStroke[];
    }

    const sortedLayers = sortLayers(page.layers);
    const hiddenLayerIds = new Set(
      sortedLayers.filter((layer) => !layer.isVisible).map((layer) => layer.id)
    );
    const layerOrderMap = new Map(sortedLayers.map((layer) => [layer.id, layer.order]));

    return [...page.strokes]
      .filter((stroke) => !hiddenLayerIds.has(stroke.layerId))
      .sort(
        (left, right) =>
          (layerOrderMap.get(left.layerId) ?? 0) - (layerOrderMap.get(right.layerId) ?? 0)
      );
  }, [page]);

  const edgeStyle = page?.settings.edgeStyle ?? "smoothstep";
  const edgeAnimated = page?.settings.edgeAnimated ?? false;
  const styledEdges = useMemo(
    () => applyEdgeStyle(visibleEdges, edgeStyle, edgeAnimated),
    [edgeAnimated, edgeStyle, visibleEdges]
  );

  if (isLoading) {
    return (
      <main className="h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(46,58,80,0.55),rgba(15,23,42,0.98)_60%)] p-3">
        <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-[#edf1f4]">
          <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[calc(100vh-9.5rem)] w-full rounded-2xl" />
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage || !page) {
    return (
      <main className="flex h-dvh w-full items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Viewer unavailable</h2>
          <p className="mt-2 text-sm text-zinc-600">{errorMessage ?? "Unable to render diagram."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(46,58,80,0.55),rgba(15,23,42,0.98)_60%)] p-3">
      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-[#edf1f4]">
        <ViewerHeader title={title} diagramId={diagramId} isOwner={isOwner} />
        <div className="min-h-0 flex-1 p-4">
          <EditorCanvas
            nodes={visibleNodes}
            edges={styledEdges}
            activeTool="select"
            readOnly
            gridVisible
            snapEnabled={false}
            gridSize={10}
            edgeStyle={edgeStyle}
            edgeAnimated={edgeAnimated}
            strokes={visibleStrokes}
            penBrushColor="#111827"
            penBrushWidth={4}
            penBrushOpacity={1}
            penEraserEnabled={false}
            initialViewport={viewport}
            onNodesChange={() => undefined}
            onEdgesChange={() => undefined}
            onConnect={() => undefined}
            onViewportChange={setViewport}
            onCanvasPlaceNode={() => undefined}
            onPenStrokeCreate={() => undefined}
            onPenStrokeDelete={() => undefined}
            onLockedNodeInteraction={() => undefined}
          />
        </div>
      </section>
    </main>
  );
}
