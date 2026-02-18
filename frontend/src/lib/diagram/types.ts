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

export const diagramDocumentSchema = z.object({
  version: z.literal(1),
  nodes: z.array(diagramNodeRecordSchema),
  edges: z.array(z.never()),
  viewport: diagramViewportSchema,
});

export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;

export const updateDiagramPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  data: diagramDocumentSchema,
});

export type UpdateDiagramPayload = z.infer<typeof updateDiagramPayloadSchema>;
