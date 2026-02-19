import type {
  DiagramEdgeType,
  DiagramNodeSize,
  DiagramNodeStyle,
  DiagramNodeType,
} from "@/lib/diagram/types";

export type TemplateCategory = "Flowchart" | "Wireframe Kit";

export type TemplateLayerBlueprint = {
  id: string;
  name: string;
  order: number;
  isVisible?: boolean;
  isLocked?: boolean;
};

export type TemplateNodeBlueprint = {
  id: string;
  assetId?: string;
  type?: DiagramNodeType;
  position: {
    x: number;
    y: number;
  };
  text?: string;
  size?: DiagramNodeSize;
  style?: DiagramNodeStyle;
  layerId?: string;
};

export type TemplateEdgeBlueprint = {
  id: string;
  source: string;
  target: string;
  type?: DiagramEdgeType;
  layerId?: string;
};

export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  layers: TemplateLayerBlueprint[];
  nodes: TemplateNodeBlueprint[];
  edges: TemplateEdgeBlueprint[];
};

export const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  {
    id: "flowchart-starter",
    name: "Flowchart starter",
    description: "A quick decision flow with process and data steps.",
    category: "Flowchart",
    layers: [{ id: "main", name: "Main", order: 0 }],
    nodes: [
      {
        id: "start",
        assetId: "flow-start-end",
        text: "Start",
        position: { x: 40, y: 200 },
      },
      {
        id: "process-1",
        assetId: "flow-process",
        text: "Collect input",
        position: { x: 280, y: 200 },
      },
      {
        id: "decision-1",
        assetId: "flow-decision",
        text: "Valid input?",
        position: { x: 540, y: 200 },
      },
      {
        id: "data-1",
        assetId: "flow-data",
        text: "Store data",
        position: { x: 820, y: 120 },
      },
      {
        id: "process-2",
        assetId: "flow-process",
        text: "Ask for retry",
        position: { x: 820, y: 300 },
      },
      {
        id: "end",
        assetId: "flow-start-end",
        text: "End",
        position: { x: 1090, y: 210 },
      },
    ],
    edges: [
      { id: "e-1", source: "start", target: "process-1", type: "smoothstep" },
      { id: "e-2", source: "process-1", target: "decision-1", type: "smoothstep" },
      { id: "e-3", source: "decision-1", target: "data-1", type: "smoothstep" },
      { id: "e-4", source: "decision-1", target: "process-2", type: "smoothstep" },
      { id: "e-5", source: "data-1", target: "end", type: "smoothstep" },
      { id: "e-6", source: "process-2", target: "end", type: "smoothstep" },
    ],
  },
  {
    id: "wireframe-starter",
    name: "Wireframe starter",
    description: "Landing-page wireframe with nav, sidebar, content card and modal.",
    category: "Wireframe Kit",
    layers: [{ id: "main", name: "Main", order: 0 }],
    nodes: [
      {
        id: "nav",
        assetId: "wireframe-navbar",
        position: { x: 60, y: 40 },
      },
      {
        id: "side",
        assetId: "wireframe-sidebar",
        position: { x: 60, y: 150 },
      },
      {
        id: "card",
        assetId: "wireframe-card",
        text: "Product Card",
        position: { x: 310, y: 170 },
      },
      {
        id: "input",
        assetId: "wireframe-input",
        text: "Search products",
        position: { x: 320, y: 380 },
      },
      {
        id: "button",
        assetId: "wireframe-button",
        text: "Primary CTA",
        position: { x: 560, y: 382 },
      },
      {
        id: "avatar",
        assetId: "wireframe-avatar",
        position: { x: 770, y: 368 },
      },
      {
        id: "modal",
        assetId: "wireframe-modal",
        text: "Confirmation",
        position: { x: 680, y: 140 },
      },
    ],
    edges: [],
  },
];

const templateById = new Map(TEMPLATE_LIBRARY.map((template) => [template.id, template]));

export const getTemplateById = (templateId: string) => templateById.get(templateId) ?? null;
