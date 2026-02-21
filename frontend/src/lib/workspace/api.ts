import { z } from "zod";
import {
  inviteExpiryOptions,
  workspaceInviteRoles,
  workspaceMemberRoles,
} from "@/lib/workspace/types";

const workspaceSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: z.enum(workspaceMemberRoles),
});

const listWorkspacesResponseSchema = z.object({
  workspaces: z.array(workspaceSummarySchema),
});

const workspaceUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
});

const workspaceMemberSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(workspaceMemberRoles),
  joinedAt: z.string(),
  user: workspaceUserSchema,
});

const workspaceInviteSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  token: z.string().min(1),
  role: z.enum(workspaceInviteRoles),
  createdByUserId: z.string().min(1),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  maxUses: z.number().int().nullable(),
  usesCount: z.number().int(),
  revokedAt: z.string().nullable(),
});

const workspaceDetailsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdByUserId: z.string().min(1),
  currentRole: z.enum(workspaceMemberRoles),
});

const workspaceDetailsResponseSchema = z.object({
  workspace: workspaceDetailsSchema,
  members: z.array(workspaceMemberSchema),
  invites: z.array(workspaceInviteSchema),
  permissions: z.object({
    canViewMembers: z.boolean(),
    canManageWorkspace: z.boolean(),
    canManageInvites: z.boolean(),
    canManageMembers: z.boolean(),
  }),
});

const createWorkspaceResponseSchema = z.object({
  workspace: workspaceSummarySchema,
});

const createInviteResponseSchema = z.object({
  invite: workspaceInviteSchema,
  inviteUrl: z.string().url(),
});

const updateWorkspaceMemberResponseSchema = z.object({
  member: workspaceMemberSchema,
});

const joinInviteResponseSchema = z.object({
  workspaceId: z.string().min(1),
  alreadyMember: z.boolean(),
  role: z.enum(workspaceMemberRoles),
});

const previewInviteResponseSchema = z.object({
  invite: z.object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    workspaceName: z.string().min(1),
    role: z.enum(workspaceInviteRoles),
    expiresAt: z.string().nullable(),
    maxUses: z.number().int().nullable(),
    usesCount: z.number().int(),
  }),
});

class WorkspaceApiError extends Error {
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

export const listMyWorkspaces = async () => {
  const response = await fetch("/api/workspaces", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    listWorkspacesResponseSchema,
    body,
    "Invalid response while loading workspaces."
  ).workspaces;
};

export const createWorkspace = async ({ name }: { name: string }) => {
  const response = await fetch("/api/workspaces", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    createWorkspaceResponseSchema,
    body,
    "Invalid response while creating workspace."
  ).workspace;
};

export const getWorkspaceDetails = async (workspaceId: string) => {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    workspaceDetailsResponseSchema,
    body,
    "Invalid response while loading workspace details."
  );
};

export const updateWorkspaceName = async ({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}) => {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }
};

export const createWorkspaceInvite = async ({
  workspaceId,
  role,
  expiry,
  maxUses,
}: {
  workspaceId: string;
  role: (typeof workspaceInviteRoles)[number];
  expiry?: (typeof inviteExpiryOptions)[number];
  maxUses?: number | null;
}) => {
  const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role,
      expiry,
      maxUses: maxUses ?? null,
    }),
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    createInviteResponseSchema,
    body,
    "Invalid response while creating invite."
  );
};

export const revokeWorkspaceInvite = async ({
  workspaceId,
  inviteId,
}: {
  workspaceId: string;
  inviteId: string;
}) => {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/invites/${inviteId}/revoke`,
    {
      method: "PATCH",
    }
  );

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }
};

export const updateWorkspaceMemberRole = async ({
  workspaceId,
  memberId,
  role,
}: {
  workspaceId: string;
  memberId: string;
  role: (typeof workspaceMemberRoles)[number];
}) => {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    updateWorkspaceMemberResponseSchema,
    body,
    "Invalid response while updating member role."
  ).member;
};

export const removeWorkspaceMember = async ({
  workspaceId,
  memberId,
}: {
  workspaceId: string;
  memberId: string;
}) => {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }
};

export const previewInviteToken = async (token: string) => {
  const response = await fetch(`/api/invite/${token}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    previewInviteResponseSchema,
    body,
    "Invalid response while loading invite."
  ).invite;
};

export const joinWorkspaceInvite = async (token: string) => {
  const response = await fetch(`/api/invite/${token}/join`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new WorkspaceApiError(await extractErrorMessage(response), response.status);
  }

  const body = await response.json();

  return parseOrThrow(
    joinInviteResponseSchema,
    body,
    "Invalid response while joining workspace."
  );
};

export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;
export type WorkspaceDetails = z.infer<typeof workspaceDetailsResponseSchema>;
export type InvitePreview = z.infer<typeof previewInviteResponseSchema>["invite"];
export { WorkspaceApiError };
