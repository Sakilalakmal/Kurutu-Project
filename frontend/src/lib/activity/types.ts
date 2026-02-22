import { z } from "zod";

export const activityActionTypes = [
  "DIAGRAM_CREATE",
  "DIAGRAM_UPDATE",
  "NODE_CREATE",
  "NODE_UPDATE",
  "NODE_DELETE",
  "EDGE_CREATE",
  "EDGE_UPDATE",
  "EDGE_DELETE",
  "FIELD_ADD",
  "FIELD_UPDATE",
  "FIELD_DELETE",
  "INVITE_CREATE",
  "INVITE_REVOKE",
  "MEMBER_JOIN",
  "MEMBER_ROLE_CHANGE",
  "MEMBER_REMOVE",
] as const;

export const activityEntityTypes = [
  "WORKSPACE",
  "DIAGRAM",
  "NODE",
  "EDGE",
  "FIELD",
  "INVITE",
  "MEMBER",
] as const;

export const activityFilterValues = ["all", "diagram", "members", "invites"] as const;
export const activityScopeValues = ["workspace", "diagram"] as const;

export type ActivityActionType = (typeof activityActionTypes)[number];
export type ActivityEntityType = (typeof activityEntityTypes)[number];
export type ActivityFilterValue = (typeof activityFilterValues)[number];
export type ActivityScopeValue = (typeof activityScopeValues)[number];

export const activityActionTypeSchema = z.enum(activityActionTypes);
export const activityEntityTypeSchema = z.enum(activityEntityTypes);
export const activityFilterSchema = z.enum(activityFilterValues);
export const activityScopeSchema = z.enum(activityScopeValues);

export const activityQuerySchema = z.object({
  workspaceId: z.string().trim().min(1),
  diagramId: z.string().trim().min(1).optional(),
  cursor: z.string().trim().min(1).optional(),
  filter: activityFilterSchema.optional(),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  actionType: activityActionTypeSchema.optional(),
  entityType: activityEntityTypeSchema.optional(),
});

export const DIAGRAM_FILTER_ACTION_TYPES: ActivityActionType[] = [
  "DIAGRAM_CREATE",
  "DIAGRAM_UPDATE",
  "NODE_CREATE",
  "NODE_UPDATE",
  "NODE_DELETE",
  "EDGE_CREATE",
  "EDGE_UPDATE",
  "EDGE_DELETE",
  "FIELD_ADD",
  "FIELD_UPDATE",
  "FIELD_DELETE",
];

export const MEMBER_FILTER_ACTION_TYPES: ActivityActionType[] = [
  "MEMBER_JOIN",
  "MEMBER_ROLE_CHANGE",
  "MEMBER_REMOVE",
];

export const INVITE_FILTER_ACTION_TYPES: ActivityActionType[] = [
  "INVITE_CREATE",
  "INVITE_REVOKE",
];

