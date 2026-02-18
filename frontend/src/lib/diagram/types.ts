import { z } from "zod";

export const diagramNodeTypeSchema = z.enum(["rectangle", "ellipse", "sticky"]);

export type DiagramNodeType = z.infer<typeof diagramNodeTypeSchema>;

export const editorToolSchema = z.enum([
  "select",
  "rectangle",
  "ellipse",
  "sticky",
  "text",
  "pen",
]);

export type EditorTool = z.infer<typeof editorToolSchema>;

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
});

export type DiagramNodeRecord = z.infer<typeof diagramNodeRecordSchema>;

export const diagramViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export type DiagramViewport = z.infer<typeof diagramViewportSchema>;

export const diagramEdgeTypeSchema = z.enum(["smoothstep", "straight"]);

export type DiagramEdgeType = z.infer<typeof diagramEdgeTypeSchema>;

export const diagramEdgeRecordSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().min(1).optional(),
  targetHandle: z.string().min(1).optional(),
  type: diagramEdgeTypeSchema.optional(),
});

export type DiagramEdgeRecord = z.infer<typeof diagramEdgeRecordSchema>;

export const diagramSettingsSchema = z.object({
  snapEnabled: z.boolean().default(true),
  gridSize: z.number().int().positive().default(10),
});

export type DiagramSettings = z.infer<typeof diagramSettingsSchema>;

export const diagramDocumentSchema = z.object({
  version: z.literal(1),
  nodes: z.array(diagramNodeRecordSchema),
  edges: z.array(diagramEdgeRecordSchema).optional().default([]),
  viewport: diagramViewportSchema,
  settings: diagramSettingsSchema.optional().default({
    snapEnabled: true,
    gridSize: 10,
  }),
});

export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;

export const updateDiagramPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  data: diagramDocumentSchema,
});

export type UpdateDiagramPayload = z.infer<typeof updateDiagramPayloadSchema>;
