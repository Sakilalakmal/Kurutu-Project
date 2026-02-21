import { z } from "zod";
import {
  diagramDocumentSchema,
  diagramPageSchema,
  updateDiagramPayloadSchema,
} from "@/lib/diagram/types";

const diagramDtoSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().nullable().optional(),
  title: z.string(),
  isPublic: z.boolean(),
  data: diagramDocumentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const latestDiagramResponseSchema = z.object({
  diagram: diagramDtoSchema,
});

type DiagramDto = z.infer<typeof diagramDtoSchema>;

const diagramMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const shareResponseSchema = z.object({
  diagram: diagramMetaSchema,
});

const viewerPageResponseSchema = z.object({
  diagramId: z.string().min(1),
  title: z.string(),
  isPublic: z.boolean(),
  isOwner: z.boolean(),
  page: diagramPageSchema,
});

class DiagramApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const fetchLatestDiagram = async ({
  workspaceId,
}: {
  workspaceId?: string | null;
} = {}): Promise<DiagramDto> => {
  const query = workspaceId
    ? `?workspaceId=${encodeURIComponent(workspaceId)}`
    : "";
  const response = await fetch(`/api/diagrams/latest${query}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DiagramApiError(await extractErrorMessage(response), response.status);
  }

  const parsed = latestDiagramResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while loading diagram.");
  }

  return parsed.data.diagram;
};

export const fetchDiagramById = async (diagramId: string): Promise<DiagramDto> => {
  const response = await fetch(`/api/diagrams/${diagramId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DiagramApiError(await extractErrorMessage(response), response.status);
  }

  const parsed = latestDiagramResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while loading diagram.");
  }

  return parsed.data.diagram;
};

export const updateDiagram = async ({
  diagramId,
  payload,
}: {
  diagramId: string;
  payload: z.infer<typeof updateDiagramPayloadSchema>;
}): Promise<DiagramDto> => {
  const validatedPayload = updateDiagramPayloadSchema.parse(payload);

  const response = await fetch(`/api/diagrams/${diagramId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  });

  if (!response.ok) {
    throw new DiagramApiError(await extractErrorMessage(response), response.status);
  }

  const parsed = latestDiagramResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while saving diagram.");
  }

  return parsed.data.diagram;
};

export const updateDiagramShare = async ({
  diagramId,
  isPublic,
}: {
  diagramId: string;
  isPublic: boolean;
}) => {
  const response = await fetch(`/api/diagrams/${diagramId}/share`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isPublic }),
  });

  if (!response.ok) {
    throw new DiagramApiError(await extractErrorMessage(response), response.status);
  }

  const parsed = shareResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while updating sharing.");
  }

  return parsed.data.diagram;
};

export const fetchDiagramPageForViewer = async ({
  diagramId,
  pageId,
}: {
  diagramId: string;
  pageId: string;
}) => {
  const response = await fetch(`/api/diagrams/${diagramId}/page/${pageId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DiagramApiError(await extractErrorMessage(response), response.status);
  }

  const parsed = viewerPageResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while loading viewer.");
  }

  return parsed.data;
};

export type { DiagramDto };
export { DiagramApiError };
