import type {
  DataTableField,
  DataTableNodeData,
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

export const createDataTableFieldId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const DEFAULT_VIEWPORT: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export const DEFAULT_GRID_SIZE = 8;

export const DEFAULT_SETTINGS: DiagramSettings = {
  snapEnabled: true,
  gridSize: DEFAULT_GRID_SIZE,
  edgeStyle: "smoothstep",
  edgeAnimated: false,
};

const DATA_TABLE_DEFAULT_WIDTH = 300;
const DATA_TABLE_HEADER_HEIGHT = 38;
const DATA_TABLE_ROW_HEIGHT = 34;
const DATA_TABLE_FOOTER_HEIGHT = 36;
const DATA_TABLE_MIN_ROWS = 1;

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
  textNode: {
    fill: "transparent",
    stroke: "#00000000",
    textColor: "#111827",
    fontSize: 16,
  },
  dataTable: {
    fill: "#ffffff",
    stroke: "#cbd5e1",
    textColor: "#111827",
  },
  wireframeButton: {
    fill: "#f8fafc",
    stroke: "#cbd5e1",
    textColor: "#0f172a",
  },
  wireframeInput: {
    fill: "#ffffff",
    stroke: "#d4d4d8",
    textColor: "#3f3f46",
  },
  wireframeCard: {
    fill: "#ffffff",
    stroke: "#d4d4d8",
    textColor: "#111827",
  },
  wireframeAvatar: {
    fill: "#f4f4f5",
    stroke: "#d4d4d8",
    textColor: "#3f3f46",
  },
  wireframeNavbar: {
    fill: "#fafafa",
    stroke: "#d4d4d8",
    textColor: "#18181b",
  },
  wireframeSidebar: {
    fill: "#fafafa",
    stroke: "#d4d4d8",
    textColor: "#18181b",
  },
  wireframeModal: {
    fill: "#ffffff",
    stroke: "#d4d4d8",
    textColor: "#18181b",
  },
};

const DEFAULT_NODE_SIZES: Record<DiagramNodeType, { width: number; height: number }> = {
  rectangle: { width: 180, height: 92 },
  ellipse: { width: 180, height: 110 },
  sticky: { width: 190, height: 135 },
  textNode: { width: 220, height: 42 },
  dataTable: {
    width: DATA_TABLE_DEFAULT_WIDTH,
    height:
      DATA_TABLE_HEADER_HEIGHT + DATA_TABLE_ROW_HEIGHT * DATA_TABLE_MIN_ROWS + DATA_TABLE_FOOTER_HEIGHT,
  },
  wireframeButton: { width: 144, height: 48 },
  wireframeInput: { width: 220, height: 52 },
  wireframeCard: { width: 280, height: 170 },
  wireframeAvatar: { width: 72, height: 72 },
  wireframeNavbar: { width: 420, height: 64 },
  wireframeSidebar: { width: 210, height: 290 },
  wireframeModal: { width: 320, height: 208 },
};

const DEFAULT_NODE_TEXT: Record<DiagramNodeType, string> = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  sticky: "Sticky note",
  textNode: "Text",
  dataTable: "Table",
  wireframeButton: "Button",
  wireframeInput: "Input",
  wireframeCard: "Card",
  wireframeAvatar: "AV",
  wireframeNavbar: "Navigation",
  wireframeSidebar: "Sidebar",
  wireframeModal: "Modal",
};

export const getDefaultNodeStyle = (type: DiagramNodeType): DiagramNodeStyle =>
  DEFAULT_NODE_STYLES[type];

export const getDefaultNodeSize = (type: DiagramNodeType) => DEFAULT_NODE_SIZES[type];

export const getDataTableNodeHeight = (fieldCount: number) =>
  DATA_TABLE_HEADER_HEIGHT +
  DATA_TABLE_ROW_HEIGHT * Math.max(DATA_TABLE_MIN_ROWS, fieldCount) +
  DATA_TABLE_FOOTER_HEIGHT;

const cloneDataTableField = (field: DataTableField): DataTableField => ({
  id: field.id,
  name: field.name,
  type: field.type,
  isPK: field.isPK,
  isFK: field.isFK,
});

export const cloneDataTableNodeData = (input: DataTableNodeData): DataTableNodeData => ({
  tableName: input.tableName,
  fields: input.fields.map(cloneDataTableField),
});

export const createDefaultDataTableNodeData = (tableName = "Table"): DataTableNodeData => ({
  tableName,
  fields: [
    {
      id: createDataTableFieldId(),
      name: "id",
      type: "int",
      isPK: true,
    },
  ],
});

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
  ...(() => {
    if (type === "dataTable") {
      const data = createDefaultDataTableNodeData();
      return {
        id,
        type,
        position: { x, y },
        size: {
          width: getDefaultNodeSize(type).width,
          height: getDataTableNodeHeight(data.fields.length),
        },
        text: DEFAULT_NODE_TEXT[type],
        style: getDefaultNodeStyle(type),
        layerId,
        data,
      } satisfies DiagramNodeRecord;
    }

    return {
      id,
      type,
      position: { x, y },
      size: getDefaultNodeSize(type),
      text: DEFAULT_NODE_TEXT[type],
      style: getDefaultNodeStyle(type),
      layerId,
    } satisfies DiagramNodeRecord;
  })(),
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
        strokes: [],
      },
    ],
  };
};
