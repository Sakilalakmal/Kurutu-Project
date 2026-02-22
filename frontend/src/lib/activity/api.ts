import { z } from "zod";
import { api } from "@/lib/api/client";
import {
  activityActionTypeSchema,
  activityEntityTypeSchema,
  activityFilterSchema,
  type ActivityActionType,
  type ActivityEntityType,
  type ActivityFilterValue,
} from "@/lib/activity/types";

const activityActorSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
});

const workspaceActivitySchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  diagramId: z.string().nullable(),
  actorUserId: z.string().min(1),
  actionType: activityActionTypeSchema,
  entityType: activityEntityTypeSchema,
  entityId: z.string().nullable(),
  summary: z.string(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
  actor: activityActorSchema,
});

const fetchActivityResponseSchema = z.object({
  activities: z.array(workspaceActivitySchema),
  nextCursor: z.string().nullable(),
});

const parseOrThrow = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallbackMessage: string
): T => {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(fallbackMessage);
  }

  return parsed.data;
};

export const fetchActivityPage = async ({
  workspaceId,
  diagramId,
  cursor,
  filter,
  search,
  actionType,
  entityType,
}: {
  workspaceId: string;
  diagramId?: string | null;
  cursor?: string;
  filter?: ActivityFilterValue;
  search?: string;
  actionType?: ActivityActionType;
  entityType?: ActivityEntityType;
}) => {
  const normalizedFilter = filter
    ? activityFilterSchema.parse(filter)
    : undefined;

  const body = await api.get<unknown>("/api/activity", {
    query: {
      workspaceId,
      diagramId: diagramId ?? undefined,
      cursor,
      filter: normalizedFilter,
      search: search?.trim() || undefined,
      actionType,
      entityType,
    },
    cache: "no-store",
  });

  return parseOrThrow(
    fetchActivityResponseSchema,
    body,
    "Invalid response while loading activity logs."
  );
};

export type WorkspaceActivityItem = z.infer<typeof workspaceActivitySchema>;

