import { getAssetById, type AssetDefinition } from "@/lib/assets/catalog";
import type { TemplateDefinition } from "@/lib/assets/templates";
import {
  cloneDataTableNodeData,
  DEFAULT_SETTINGS,
  DEFAULT_VIEWPORT,
  getDataTableNodeHeight,
  getDefaultNodeSize,
  getDefaultNodeStyle,
} from "@/lib/diagram/defaults";
import { ensurePageLayerRefs } from "@/lib/diagram/layers";
import { cloneRelationEdgeData } from "@/lib/diagram/relations";
import type {
  DiagramEdgeRecord,
  DiagramNodeRecord,
  DiagramPage,
  DiagramSettings,
  DiagramViewport,
} from "@/lib/diagram/types";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const resolveAssetStyle = (
  asset: AssetDefinition,
  overrides?: Pick<DiagramNodeRecord, "size" | "text" | "style" | "data">
) => ({
  size: overrides?.size ?? asset.defaultSize,
  text: overrides?.text ?? asset.defaultData.text,
  style: overrides?.style ?? asset.defaultStyle,
  data: overrides?.data ?? asset.defaultData.nodeData,
});

export const createNodeFromAsset = (
  asset: AssetDefinition,
  position: { x: number; y: number },
  layerId: string
): DiagramNodeRecord => {
  const { size, text, style, data } = resolveAssetStyle(asset);
  const resolvedData = data ? cloneDataTableNodeData(data) : undefined;
  const resolvedSize =
    asset.nodeType === "dataTable" && resolvedData
      ? {
          width: size.width,
          height: getDataTableNodeHeight(resolvedData.fields.length),
        }
      : size;

  return {
    id: createId("node"),
    type: asset.nodeType,
    position: {
      x: position.x,
      y: position.y,
    },
    size: {
      width: resolvedSize.width,
      height: resolvedSize.height,
    },
    text,
    style: {
      fill: style.fill,
      stroke: style.stroke,
      textColor: style.textColor,
    },
    layerId,
    data: resolvedData,
  };
};

const createFallbackNode = (
  node: TemplateDefinition["nodes"][number],
  layerId: string
): DiagramNodeRecord => {
  const fallbackType = node.type ?? "rectangle";

  return {
    id: createId("node"),
    type: fallbackType,
    position: node.position,
    size: node.size ?? getDefaultNodeSize(fallbackType),
    text: node.text ?? "Node",
    style: node.style ?? getDefaultNodeStyle(fallbackType),
    layerId,
  };
};

export const applyTemplate = (
  template: TemplateDefinition,
  options?: {
    pageName?: string;
    settings?: DiagramSettings;
    viewport?: DiagramViewport;
  }
): DiagramPage => {
  const fallbackLayer = template.layers[0] ?? {
    id: "main",
    name: "Main",
    order: 0,
    isVisible: true,
    isLocked: false,
  };

  const layerIdMap = new Map(
    template.layers.map((layer) => [layer.id, createId("layer")])
  );
  const resolvedFallbackLayerId =
    layerIdMap.get(fallbackLayer.id) ?? createId("layer");

  const layers = template.layers.map((layer, index) => ({
    id: layerIdMap.get(layer.id) ?? createId("layer"),
    name: layer.name,
    order: Number.isInteger(layer.order) ? layer.order : index,
    isVisible: layer.isVisible ?? true,
    isLocked: layer.isLocked ?? false,
  }));

  const nodeIdMap = new Map(template.nodes.map((node) => [node.id, createId("node")]));
  const nodes: DiagramNodeRecord[] = template.nodes.map((node) => {
    const targetLayerId =
      layerIdMap.get(node.layerId ?? fallbackLayer.id) ?? resolvedFallbackLayerId;
    const asset = node.assetId ? getAssetById(node.assetId) : null;

    const nextNode = asset
      ? createNodeFromAsset(asset, node.position, targetLayerId)
      : createFallbackNode(node, targetLayerId);

    return {
      ...nextNode,
      id: nodeIdMap.get(node.id) ?? createId("node"),
      text: node.text ?? nextNode.text,
      size:
        node.data && (node.type ?? asset?.nodeType) === "dataTable"
          ? {
              width: (node.size ?? nextNode.size).width,
              height: getDataTableNodeHeight(node.data.fields.length),
            }
          : node.size ?? nextNode.size,
      style: node.style ?? nextNode.style,
      data: node.data ?? nextNode.data,
    };
  });

  const edges: DiagramEdgeRecord[] = template.edges.flatMap((edge) => {
    const source = nodeIdMap.get(edge.source);
    const target = nodeIdMap.get(edge.target);

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: createId("edge"),
        source,
        target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type ?? "smoothstep",
        layerId:
          layerIdMap.get(edge.layerId ?? fallbackLayer.id) ?? resolvedFallbackLayerId,
        data: edge.data
          ? cloneRelationEdgeData({
              ...edge.data,
              fromTableId: nodeIdMap.get(edge.data.fromTableId) ?? source,
              toTableId: nodeIdMap.get(edge.data.toTableId) ?? target,
            })
          : undefined,
      },
    ];
  });

  return ensurePageLayerRefs({
    id: createId("page"),
    name: options?.pageName ?? template.name,
    viewport: options?.viewport ?? { ...DEFAULT_VIEWPORT },
    settings: options?.settings ?? { ...DEFAULT_SETTINGS },
    layers:
      layers.length > 0
        ? layers
        : [
            {
              id: resolvedFallbackLayerId,
              name: "Main",
              order: 0,
              isVisible: true,
              isLocked: false,
            },
          ],
    activeLayerId: resolvedFallbackLayerId,
    nodes,
    edges,
    strokes: [],
  });
};
