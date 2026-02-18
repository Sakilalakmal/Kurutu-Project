import { z } from "zod";
import { diagramDocumentSchema, updateDiagramPayloadSchema } from "@/lib/diagram/types";

const diagramDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  data: diagramDocumentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const latestDiagramResponseSchema = z.object({
  diagram: diagramDtoSchema,
});

type DiagramDto = z.infer<typeof diagramDtoSchema>;

const extractErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const fetchLatestDiagram = async (): Promise<DiagramDto> => {
  const response = await fetch("/api/diagrams/latest", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
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
    throw new Error(await extractErrorMessage(response));
  }

  const parsed = latestDiagramResponseSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("Invalid response while saving diagram.");
  }

  return parsed.data.diagram;
};

export type { DiagramDto };
