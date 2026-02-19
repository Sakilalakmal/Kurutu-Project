import type {
  DiagramDocumentV2,
  DiagramEdgeRecord,
  DiagramLayer,
  DiagramNodeRecord,
  DiagramPage,
  DiagramSettings,
  DiagramViewport,
} from "@/lib/diagram/model";
import { DEFAULT_SETTINGS, DEFAULT_VIEWPORT } from "@/lib/diagram/defaults";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createDefaultLayer = (order = 0, name?: string): DiagramLayer => ({
  id: createId("layer"),
  name: name ?? `Layer ${order + 1}`,
  order,
  isVisible: true,
  isLocked: false,
});

export const sortLayers = (layers: DiagramLayer[]) =>
  [...layers].sort((a, b) => a.order - b.order);

export const normalizeLayerOrders = (layers: DiagramLayer[]) =>
  sortLayers(layers).map((layer, index) => ({
    ...layer,
    order: index,
  }));

export const ensureLayerSet = (layers: DiagramLayer[]) => {
  if (layers.length === 0) {
    return [createDefaultLayer(0)];
  }

  return normalizeLayerOrders(layers);
};

export const resolveActiveLayerId = (layers: DiagramLayer[], activeLayerId: string) => {
  if (layers.some((layer) => layer.id === activeLayerId)) {
    return activeLayerId;
  }

  return sortLayers(layers)[0]?.id ?? createDefaultLayer(0).id;
};

export const isLayerLocked = (layers: DiagramLayer[], layerId: string) =>
  layers.find((layer) => layer.id === layerId)?.isLocked ?? false;

export const isLayerVisible = (layers: DiagramLayer[], layerId: string) =>
  layers.find((layer) => layer.id === layerId)?.isVisible ?? true;

export const reorderLayers = (
  layers: DiagramLayer[],
  layerId: string,
  direction: "up" | "down"
) => {
  const ordered = sortLayers(layers);
  const index = ordered.findIndex((layer) => layer.id === layerId);

  if (index < 0) {
    return ordered;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

  return normalizeLayerOrders(next);
};

export const createDefaultPage = ({
  name,
  settings,
  viewport,
}: {
  name: string;
  settings?: DiagramSettings;
  viewport?: DiagramViewport;
}): DiagramPage => {
  const layer = createDefaultLayer(0, "Layer 1");

  return {
    id: createId("page"),
    name,
    viewport: viewport ?? { ...DEFAULT_VIEWPORT },
    settings: settings ?? { ...DEFAULT_SETTINGS },
    layers: [layer],
    activeLayerId: layer.id,
    nodes: [],
    edges: [],
  };
};

export const createEmptyDiagramDocumentV2 = (): DiagramDocumentV2 => {
  const page = createDefaultPage({
    name: "Page 1",
  });

  return {
    dataVersion: 2,
    activePageId: page.id,
    pages: [page],
  };
};

export const ensurePageLayerRefs = (page: DiagramPage): DiagramPage => {
  const ensuredLayers = ensureLayerSet(page.layers);
  const fallbackLayerId = ensuredLayers[0].id;
  const layerIds = new Set(ensuredLayers.map((layer) => layer.id));

  const normalizedNodes: DiagramNodeRecord[] = page.nodes.map((node) => ({
    ...node,
    layerId: layerIds.has(node.layerId) ? node.layerId : fallbackLayerId,
  }));

  const normalizedEdges: DiagramEdgeRecord[] = page.edges.map((edge) => ({
    ...edge,
    layerId: layerIds.has(edge.layerId) ? edge.layerId : fallbackLayerId,
  }));

  return {
    ...page,
    layers: ensuredLayers,
    activeLayerId: resolveActiveLayerId(ensuredLayers, page.activeLayerId),
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
};

export const nextPageName = (pages: DiagramPage[]) => `Page ${pages.length + 1}`;

export const upsertPage = (pages: DiagramPage[], nextPage: DiagramPage) => {
  const index = pages.findIndex((page) => page.id === nextPage.id);

  if (index === -1) {
    return [...pages, nextPage];
  }

  return pages.map((page) => (page.id === nextPage.id ? nextPage : page));
};

export const getVisibleNodeIds = (nodes: DiagramNodeRecord[], layers: DiagramLayer[]) => {
  const hiddenLayerIds = new Set(
    layers.filter((layer) => !layer.isVisible).map((layer) => layer.id)
  );

  return new Set(
    nodes.filter((node) => !hiddenLayerIds.has(node.layerId)).map((node) => node.id)
  );
};
