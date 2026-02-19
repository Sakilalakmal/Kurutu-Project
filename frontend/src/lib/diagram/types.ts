import { z } from "zod";
import { diagramDocumentSchema, diagramNodeTypeSchema } from "@/lib/diagram/model";

export {
  diagramDocumentSchema,
  diagramEdgeRecordSchema,
  diagramEdgeTypeSchema,
  diagramLayerSchema,
  diagramNodeRecordSchema,
  diagramNodeSizeSchema,
  diagramNodeStyleSchema,
  diagramNodeTypeSchema,
  diagramPageSchema,
  diagramSettingsSchema,
  diagramViewportSchema,
} from "@/lib/diagram/model";

export type {
  DiagramDocument,
  DiagramDocumentV2,
  DiagramEdgeRecord,
  DiagramEdgeType,
  DiagramLayer,
  DiagramNodeRecord,
  DiagramNodeSize,
  DiagramNodeStyle,
  DiagramNodeType,
  DiagramPage,
  DiagramSettings,
  DiagramViewport,
} from "@/lib/diagram/model";

export const editorToolSchema = z.enum([
  "select",
  ...diagramNodeTypeSchema.options,
  "text",
  "pen",
]);

export type EditorTool = z.infer<typeof editorToolSchema>;

export const updateDiagramPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  data: diagramDocumentSchema,
});

export type UpdateDiagramPayload = z.infer<typeof updateDiagramPayloadSchema>;
