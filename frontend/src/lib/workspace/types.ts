export const workspaceMemberRoles = ["OWNER", "EDITOR", "VIEWER"] as const;
export type WorkspaceMemberRole = (typeof workspaceMemberRoles)[number];

export const workspaceInviteRoles = ["EDITOR", "VIEWER"] as const;
export type WorkspaceInviteRole = (typeof workspaceInviteRoles)[number];

export const inviteExpiryOptions = ["7", "30", "never"] as const;
export type InviteExpiryOption = (typeof inviteExpiryOptions)[number];

export const WORKSPACE_STORAGE_KEY = "kurutu:workspace:lastWorkspaceId";

export const isWorkspaceManagerRole = (role: WorkspaceMemberRole) =>
  role === "OWNER" || role === "EDITOR";