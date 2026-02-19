import { z } from "zod";
import { DEFAULT_GRID_SIZE, DEFAULT_SETTINGS, DEFAULT_VIEWPORT } from "@/lib/diagram/defaults";
import {
  createDefaultLayer,
  createEmptyDiagramDocumentV2,
  ensurePageLayerRefs,
} from "@/lib/diagram/layers";
import {
  diagramDocumentV2Schema,
  diagramEdgeRecordSchema,
  diagramNodeRecordSchema,
  diagramSettingsSchema,
  diagramViewportSchema,
  type DiagramDocumentV2,
} from "@/lib/diagram/model";

const legacyDiagramDocumentSchema = z.object({
  version: z.literal(1),
  nodes: z.array(diagramNodeRecordSchema.omit({ layerId: true })).default([]),
  edges: z.array(diagramEdgeRecordSchema.omit({ layerId: true })).optional().default([]),
  viewport: diagramViewportSchema.optional().default(DEFAULT_VIEWPORT),
  settings: diagramSettingsSchema
    .optional()
    .default({
      snapEnabled: DEFAULT_SETTINGS.snapEnabled,
      gridSize: DEFAULT_GRID_SIZE,
    }),
});

const normalizeV2Document = (document: DiagramDocumentV2): DiagramDocumentV2 => {
  const normalizedPages = document.pages.map((page) => ensurePageLayerRefs(page));

  const activePageId = normalizedPages.some((page) => page.id === document.activePageId)
    ? document.activePageId
    : normalizedPages[0].id;

  return {
    dataVersion: 2,
    activePageId,
    pages: normalizedPages,
  };
};

const migrateLegacyDocument = (
  legacy: z.infer<typeof legacyDiagramDocumentSchema>
): DiagramDocumentV2 => {
  const layer = createDefaultLayer(0, "Layer 1");
  const viewport = legacy.viewport ?? DEFAULT_VIEWPORT;
  const settings = legacy.settings ?? DEFAULT_SETTINGS;

  return {
    dataVersion: 2,
    activePageId: "page-1",
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        viewport,
        settings,
        layers: [layer],
        activeLayerId: layer.id,
        nodes: legacy.nodes.map((node) => ({
          ...node,
          layerId: layer.id,
        })),
        edges: legacy.edges.map((edge) => ({
          ...edge,
          layerId: layer.id,
        })),
      },
    ],
  };
};

export const migrateDiagramData = (input: unknown): DiagramDocumentV2 => {
  const parsedV2 = diagramDocumentV2Schema.safeParse(input);

  if (parsedV2.success) {
    return normalizeV2Document(parsedV2.data);
  }

  const parsedLegacy = legacyDiagramDocumentSchema.safeParse(input);

  if (parsedLegacy.success) {
    return migrateLegacyDocument(parsedLegacy.data);
  }

  return createEmptyDiagramDocumentV2();
};
