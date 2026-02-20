import type {
  DataTableNodeData,
  DiagramEdgeType,
  DiagramNodeSize,
  DiagramNodeStyle,
  DiagramNodeType,
  RelationEdgeData,
} from "@/lib/diagram/types";

export type TemplateCategory = "Flowchart" | "Wireframe Kit" | "Data Modeling";

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
  data?: DataTableNodeData;
};

export type TemplateEdgeBlueprint = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: DiagramEdgeType;
  layerId?: string;
  data?: RelationEdgeData;
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
    id: "data-model-starter",
    name: "Data Model Starter",
    description: "Starter ERD with table fields and linked relationships.",
    category: "Data Modeling",
    layers: [{ id: "main", name: "Main", order: 0 }],
    nodes: [
      {
        id: "customers",
        assetId: "data-table",
        text: "Customers",
        position: { x: 70, y: 70 },
        data: {
          tableName: "Customers",
          fields: [
            { id: "customers-customer-id", name: "CustomerID", type: "int", isPK: true },
            { id: "customers-name", name: "Name", type: "nvarchar(120)" },
            { id: "customers-email", name: "Email", type: "nvarchar(160)" },
          ],
        },
      },
      {
        id: "orders",
        assetId: "data-table",
        text: "Orders",
        position: { x: 460, y: 170 },
        data: {
          tableName: "Orders",
          fields: [
            { id: "orders-order-id", name: "OrderID", type: "int", isPK: true },
            { id: "orders-customer-id", name: "CustomerID", type: "int", isFK: true },
            { id: "orders-created-at", name: "CreatedAt", type: "datetime" },
          ],
        },
      },
      {
        id: "order-items",
        assetId: "data-table",
        text: "OrderItems",
        position: { x: 850, y: 170 },
        data: {
          tableName: "OrderItems",
          fields: [
            { id: "items-order-item-id", name: "OrderItemID", type: "int", isPK: true },
            { id: "items-order-id", name: "OrderID", type: "int", isFK: true },
            { id: "items-product-id", name: "ProductID", type: "int", isFK: true },
          ],
        },
      },
    ],
    edges: [
      {
        id: "rel-customers-orders",
        source: "customers",
        target: "orders",
        sourceHandle: "field:customers-customer-id:right",
        targetHandle: "field:orders-customer-id:left",
        data: {
          kind: "relation",
          fromTableId: "customers",
          toTableId: "orders",
          fromFieldId: "customers-customer-id",
          toFieldId: "orders-customer-id",
          relationType: "one-to-many",
          fromOptional: false,
          toOptional: false,
          labelMode: "auto",
          label: "Customers.CustomerID \u2192 Orders.CustomerID",
        },
      },
      {
        id: "rel-orders-items",
        source: "orders",
        target: "order-items",
        sourceHandle: "field:orders-order-id:right",
        targetHandle: "field:items-order-id:left",
        data: {
          kind: "relation",
          fromTableId: "orders",
          toTableId: "order-items",
          fromFieldId: "orders-order-id",
          toFieldId: "items-order-id",
          relationType: "one-to-many",
          fromOptional: false,
          toOptional: false,
          labelMode: "auto",
          label: "Orders.OrderID \u2192 OrderItems.OrderID",
        },
      },
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
