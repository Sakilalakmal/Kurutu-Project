import type {
  DiagramNodeSize,
  DiagramNodeStyle,
  DiagramNodeType,
} from "@/lib/diagram/types";

export const ASSET_DRAG_MIME = "application/x-kurutu-asset";

export const ASSET_CATEGORIES = [
  "Flowchart",
  "Wireframe",
  "Basic Shapes",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export type AssetDefinition = {
  id: string;
  name: string;
  category: AssetCategory;
  nodeType: DiagramNodeType;
  defaultSize: DiagramNodeSize;
  defaultData: {
    text: string;
  };
  defaultStyle: DiagramNodeStyle;
  tags: string[];
};

export const ASSET_CATALOG: AssetDefinition[] = [
  {
    id: "flow-start-end",
    name: "Start / End",
    category: "Flowchart",
    nodeType: "ellipse",
    defaultSize: { width: 170, height: 92 },
    defaultData: { text: "Start" },
    defaultStyle: { fill: "#ecfeff", stroke: "#67e8f9", textColor: "#0f172a" },
    tags: ["start", "end", "terminator", "flowchart"],
  },
  {
    id: "flow-process",
    name: "Process",
    category: "Flowchart",
    nodeType: "rectangle",
    defaultSize: { width: 190, height: 92 },
    defaultData: { text: "Process" },
    defaultStyle: { fill: "#ffffff", stroke: "#cbd5e1", textColor: "#111827" },
    tags: ["process", "step", "action", "flowchart"],
  },
  {
    id: "flow-decision",
    name: "Decision",
    category: "Flowchart",
    nodeType: "rectangle",
    defaultSize: { width: 190, height: 98 },
    defaultData: { text: "Decision?" },
    defaultStyle: { fill: "#f8fafc", stroke: "#94a3b8", textColor: "#0f172a" },
    tags: ["decision", "branch", "if", "yes", "no", "flowchart"],
  },
  {
    id: "flow-data",
    name: "Data",
    category: "Flowchart",
    nodeType: "rectangle",
    defaultSize: { width: 188, height: 88 },
    defaultData: { text: "Data" },
    defaultStyle: { fill: "#f8fafc", stroke: "#bfdbfe", textColor: "#1f2937" },
    tags: ["data", "input", "output", "flowchart"],
  },
  {
    id: "flow-connector",
    name: "Connector",
    category: "Flowchart",
    nodeType: "ellipse",
    defaultSize: { width: 92, height: 66 },
    defaultData: { text: "A" },
    defaultStyle: { fill: "#eef2ff", stroke: "#a5b4fc", textColor: "#1e1b4b" },
    tags: ["connector", "link", "jump", "flowchart"],
  },
  {
    id: "wireframe-button",
    name: "Button",
    category: "Wireframe",
    nodeType: "wireframeButton",
    defaultSize: { width: 144, height: 48 },
    defaultData: { text: "Button" },
    defaultStyle: { fill: "#f8fafc", stroke: "#cbd5e1", textColor: "#0f172a" },
    tags: ["wireframe", "button", "cta", "ui"],
  },
  {
    id: "wireframe-input",
    name: "Input",
    category: "Wireframe",
    nodeType: "wireframeInput",
    defaultSize: { width: 220, height: 52 },
    defaultData: { text: "Email address" },
    defaultStyle: { fill: "#ffffff", stroke: "#d4d4d8", textColor: "#3f3f46" },
    tags: ["wireframe", "input", "field", "form", "ui"],
  },
  {
    id: "wireframe-card",
    name: "Card",
    category: "Wireframe",
    nodeType: "wireframeCard",
    defaultSize: { width: 280, height: 170 },
    defaultData: { text: "Card Title" },
    defaultStyle: { fill: "#ffffff", stroke: "#d4d4d8", textColor: "#111827" },
    tags: ["wireframe", "card", "container", "ui"],
  },
  {
    id: "wireframe-avatar",
    name: "Avatar",
    category: "Wireframe",
    nodeType: "wireframeAvatar",
    defaultSize: { width: 72, height: 72 },
    defaultData: { text: "AV" },
    defaultStyle: { fill: "#f4f4f5", stroke: "#d4d4d8", textColor: "#3f3f46" },
    tags: ["wireframe", "avatar", "profile", "ui"],
  },
  {
    id: "wireframe-navbar",
    name: "Navbar",
    category: "Wireframe",
    nodeType: "wireframeNavbar",
    defaultSize: { width: 420, height: 64 },
    defaultData: { text: "Navigation" },
    defaultStyle: { fill: "#fafafa", stroke: "#d4d4d8", textColor: "#18181b" },
    tags: ["wireframe", "navbar", "topbar", "ui", "navigation"],
  },
  {
    id: "wireframe-sidebar",
    name: "Sidebar",
    category: "Wireframe",
    nodeType: "wireframeSidebar",
    defaultSize: { width: 210, height: 290 },
    defaultData: { text: "Sidebar" },
    defaultStyle: { fill: "#fafafa", stroke: "#d4d4d8", textColor: "#18181b" },
    tags: ["wireframe", "sidebar", "navigation", "ui"],
  },
  {
    id: "wireframe-modal",
    name: "Modal",
    category: "Wireframe",
    nodeType: "wireframeModal",
    defaultSize: { width: 320, height: 208 },
    defaultData: { text: "Modal Title" },
    defaultStyle: { fill: "#ffffff", stroke: "#d4d4d8", textColor: "#18181b" },
    tags: ["wireframe", "modal", "dialog", "overlay", "ui"],
  },
  {
    id: "shape-rectangle",
    name: "Rect",
    category: "Basic Shapes",
    nodeType: "rectangle",
    defaultSize: { width: 180, height: 92 },
    defaultData: { text: "Rectangle" },
    defaultStyle: { fill: "#ffffff", stroke: "#cbd5e1", textColor: "#111827" },
    tags: ["rect", "rectangle", "shape", "basic"],
  },
  {
    id: "shape-ellipse",
    name: "Ellipse",
    category: "Basic Shapes",
    nodeType: "ellipse",
    defaultSize: { width: 180, height: 110 },
    defaultData: { text: "Ellipse" },
    defaultStyle: { fill: "#eef2ff", stroke: "#c7d2fe", textColor: "#1f2937" },
    tags: ["ellipse", "circle", "shape", "basic"],
  },
  {
    id: "shape-sticky",
    name: "Sticky",
    category: "Basic Shapes",
    nodeType: "sticky",
    defaultSize: { width: 190, height: 135 },
    defaultData: { text: "Sticky note" },
    defaultStyle: { fill: "#fef3c7", stroke: "#fcd34d", textColor: "#1f2937" },
    tags: ["sticky", "note", "shape", "basic"],
  },
];

const catalogById = new Map(ASSET_CATALOG.map((asset) => [asset.id, asset]));

export const getAssetById = (assetId: string) => catalogById.get(assetId) ?? null;
