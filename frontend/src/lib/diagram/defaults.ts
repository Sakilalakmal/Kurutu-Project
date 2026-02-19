import type {
  DiagramDocument,
  DiagramSettings,
  DiagramNodeRecord,
  DiagramNodeStyle,
  DiagramNodeType,
  DiagramViewport,
} from "@/lib/diagram/types";

const createId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const DEFAULT_VIEWPORT: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export const DEFAULT_GRID_SIZE = 10;

export const DEFAULT_SETTINGS: DiagramSettings = {
  snapEnabled: true,
  gridSize: DEFAULT_GRID_SIZE,
};

const DEFAULT_NODE_STYLES: Record<DiagramNodeType, DiagramNodeStyle> = {
  rectangle: {
    fill: "#ffffff",
    stroke: "#cbd5e1",
    textColor: "#111827",
  },
  ellipse: {
    fill: "#eef2ff",
    stroke: "#c7d2fe",
    textColor: "#1f2937",
  },
  sticky: {
    fill: "#fef3c7",
    stroke: "#fcd34d",
    textColor: "#1f2937",
  },
};

const DEFAULT_NODE_SIZES: Record<DiagramNodeType, { width: number; height: number }> = {
  rectangle: { width: 180, height: 92 },
  ellipse: { width: 180, height: 110 },
  sticky: { width: 190, height: 135 },
};

const DEFAULT_NODE_TEXT: Record<DiagramNodeType, string> = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  sticky: "Sticky note",
};

export const getDefaultNodeStyle = (type: DiagramNodeType): DiagramNodeStyle =>
  DEFAULT_NODE_STYLES[type];

export const getDefaultNodeSize = (type: DiagramNodeType) => DEFAULT_NODE_SIZES[type];

export const createDefaultNodeRecord = ({
  id,
  type,
  x,
  y,
  layerId,
}: {
  id: string;
  type: DiagramNodeType;
  x: number;
  y: number;
  layerId: string;
}): DiagramNodeRecord => ({
  id,
  type,
  position: { x, y },
  size: getDefaultNodeSize(type),
  text: DEFAULT_NODE_TEXT[type],
  style: getDefaultNodeStyle(type),
  layerId,
});

export const createEmptyDiagramDocument = (): DiagramDocument => {
  const pageId = createId("page");
  const layerId = createId("layer");

  return {
    dataVersion: 2,
    activePageId: pageId,
    pages: [
      {
        id: pageId,
        name: "Page 1",
        viewport: { ...DEFAULT_VIEWPORT },
        settings: { ...DEFAULT_SETTINGS },
        layers: [
          {
            id: layerId,
            name: "Layer 1",
            order: 0,
            isVisible: true,
            isLocked: false,
          },
        ],
        activeLayerId: layerId,
        nodes: [],
        edges: [],
      },
    ],
  };
};
