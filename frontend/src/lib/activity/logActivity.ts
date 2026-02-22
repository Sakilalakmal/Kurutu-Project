import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import type { ActivityActionType, ActivityEntityType } from "@/lib/activity/types";

const SENSITIVE_METADATA_KEY = /(token|password|secret|access.?token|refresh.?token)/i;

const sanitizeMetadataValue = (
  value: unknown,
  seen: WeakSet<object>
): Prisma.JsonValue | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const nextItems = value
      .map((entry) => sanitizeMetadataValue(entry, seen))
      .filter((entry): entry is Prisma.JsonValue => entry !== undefined);

    return nextItems;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  if (seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  const nextObject: Record<string, Prisma.JsonValue> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_METADATA_KEY.test(key)) {
      nextObject[key] = "[REDACTED]";
      continue;
    }

    const sanitizedEntry = sanitizeMetadataValue(entry, seen);

    if (sanitizedEntry !== undefined) {
      nextObject[key] = sanitizedEntry;
    }
  }

  seen.delete(value);

  return nextObject;
};

export type LogActivityInput = {
  workspaceId: string;
  diagramId?: string | null;
  actorUserId: string;
  actionType: ActivityActionType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: unknown;
  tx?: Prisma.TransactionClient;
};

export const logActivity = async ({
  workspaceId,
  diagramId,
  actorUserId,
  actionType,
  entityType,
  entityId,
  summary,
  metadata,
  tx,
}: LogActivityInput) => {
  const normalizedSummary = summary.trim();

  if (!workspaceId || !actorUserId || normalizedSummary.length === 0) {
    return;
  }

  const sanitizedMetadata = sanitizeMetadataValue(metadata, new WeakSet<object>());
  const metadataValue =
    sanitizedMetadata === undefined
      ? undefined
      : sanitizedMetadata === null
        ? Prisma.JsonNull
        : sanitizedMetadata;
  const client = tx ?? prisma;

  await client.workspaceActivity.create({
    data: {
      workspaceId,
      diagramId: diagramId ?? null,
      actorUserId,
      actionType,
      entityType,
      entityId: entityId ?? null,
      summary: normalizedSummary,
      ...(metadataValue !== undefined ? { metadata: metadataValue } : {}),
    },
  });
};
