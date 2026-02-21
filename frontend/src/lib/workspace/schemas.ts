import { z } from "zod";
import {
  inviteExpiryOptions,
  workspaceInviteRoles,
  workspaceMemberRoles,
} from "@/lib/workspace/types";

export const workspaceIdSchema = z.string().min(1);
export const workspaceMemberIdSchema = z.string().min(1);
export const workspaceInviteIdSchema = z.string().min(1);
export const workspaceInviteTokenSchema = z.string().min(1);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createWorkspaceInviteSchema = z.object({
  role: z.enum(workspaceInviteRoles),
  expiry: z.enum(inviteExpiryOptions).optional(),
  maxUses: z
    .number()
    .int()
    .positive()
    .max(10000)
    .nullable()
    .optional(),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(workspaceMemberRoles),
});

export const diagramsLatestQuerySchema = z.object({
  workspaceId: z.string().trim().min(1).optional(),
});