import { z } from "zod";

export const diagramNodeTypeSchema = z.enum([
  "rectangle",
  "ellipse",
  "sticky",
  "wireframeButton",
  "wireframeInput",
  "wireframeCard",
  "wireframeAvatar",
  "wireframeNavbar",
  "wireframeSidebar",
  "wireframeModal",
]);
export type DiagramNodeType = z.infer<typeof diagramNodeTypeSchema>;

export const diagramNodeStyleSchema = z.object({
  fill: z.string().min(1),
  stroke: z.string().min(1),
  textColor: z.string().min(1),
});
export type DiagramNodeStyle = z.infer<typeof diagramNodeStyleSchema>;

export const diagramNodeSizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});
export type DiagramNodeSize = z.infer<typeof diagramNodeSizeSchema>;

export const diagramViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});
export type DiagramViewport = z.infer<typeof diagramViewportSchema>;

export const diagramEdgeTypeSchema = z.enum([
  "smoothstep",
  "straight",
  "step",
  "bezier",
]);
export type DiagramEdgeType = z.infer<typeof diagramEdgeTypeSchema>;

export const diagramSettingsSchema = z.object({
  snapEnabled: z.boolean().default(true),
  gridSize: z.number().int().positive().default(10),
  edgeStyle: diagramEdgeTypeSchema.default("smoothstep"),
  edgeAnimated: z.boolean().default(false),
});
export type DiagramSettings = z.infer<typeof diagramSettingsSchema>;

export const diagramLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  isVisible: z.boolean().default(true),
  isLocked: z.boolean().default(false),
});
export type DiagramLayer = z.infer<typeof diagramLayerSchema>;

export const diagramNodeRecordSchema = z.object({
  id: z.string().min(1),
  type: diagramNodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: diagramNodeSizeSchema,
  text: z.string(),
  style: diagramNodeStyleSchema,
  layerId: z.string().min(1),
});
export type DiagramNodeRecord = z.infer<typeof diagramNodeRecordSchema>;

export const diagramEdgeRecordSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().min(1).optional(),
  targetHandle: z.string().min(1).optional(),
  type: diagramEdgeTypeSchema.optional(),
  layerId: z.string().min(1),
});
export type DiagramEdgeRecord = z.infer<typeof diagramEdgeRecordSchema>;

export const diagramPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  viewport: diagramViewportSchema,
  settings: diagramSettingsSchema,
  layers: z.array(diagramLayerSchema).min(1),
  activeLayerId: z.string().min(1),
  nodes: z.array(diagramNodeRecordSchema),
  edges: z.array(diagramEdgeRecordSchema),
});
export type DiagramPage = z.infer<typeof diagramPageSchema>;

export const diagramDocumentV2Schema = z.object({
  dataVersion: z.literal(2),
  activePageId: z.string().min(1),
  pages: z.array(diagramPageSchema).min(1),
});
export type DiagramDocumentV2 = z.infer<typeof diagramDocumentV2Schema>;

export const diagramDocumentSchema = diagramDocumentV2Schema;
export type DiagramDocument = DiagramDocumentV2;
