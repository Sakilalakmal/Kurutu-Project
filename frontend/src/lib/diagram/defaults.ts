import type {
  DiagramDocument,
  DiagramNodeRecord,
  DiagramNodeStyle,
  DiagramNodeType,
  DiagramViewport,
} from "@/lib/diagram/types";

export const DEFAULT_VIEWPORT: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1,
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
}: {
  id: string;
  type: DiagramNodeType;
  x: number;
  y: number;
}): DiagramNodeRecord => ({
  id,
  type,
  position: { x, y },
  size: getDefaultNodeSize(type),
  text: DEFAULT_NODE_TEXT[type],
  style: getDefaultNodeStyle(type),
});

export const createEmptyDiagramDocument = (): DiagramDocument => ({
  version: 1,
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
});
