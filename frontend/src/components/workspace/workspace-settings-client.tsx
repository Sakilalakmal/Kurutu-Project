"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createWorkspaceInvite,
  getWorkspaceDetails,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  type WorkspaceDetails,
  updateWorkspaceMemberRole,
  updateWorkspaceName,
} from "@/lib/workspace/api";
import { inviteExpiryOptions, workspaceInviteRoles, workspaceMemberRoles } from "@/lib/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkspaceSettingsClientProps = {
  workspaceId: string;
};

const expiryLabels: Record<(typeof inviteExpiryOptions)[number], string> = {
  "7": "7 days",
  "30": "30 days",
  never: "Never",
};

export function WorkspaceSettingsClient({ workspaceId }: WorkspaceSettingsClientProps) {
  const [details, setDetails] = useState<WorkspaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [isCreateInviteOpen, setIsCreateInviteOpen] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<(typeof workspaceInviteRoles)[number]>("EDITOR");
  const [inviteExpiry, setInviteExpiry] = useState<(typeof inviteExpiryOptions)[number]>("7");
  const [inviteMaxUses, setInviteMaxUses] = useState("");

  const loadWorkspace = useCallback(async () => {
    try {
      const nextDetails = await getWorkspaceDetails(workspaceId);
      setDetails(nextDetails);
      setRenameValue(nextDetails.workspace.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const ownerCount = useMemo(
    () => details?.members.filter((member) => member.role === "OWNER").length ?? 0,
    [details?.members]
  );

  const handleRenameWorkspace = async () => {
    if (!details?.permissions.canManageWorkspace) {
      return;
    }

    const normalizedName = renameValue.trim();

    if (!normalizedName) {
      toast.error("Workspace name is required.");
      return;
    }

    setIsRenaming(true);

    try {
      await updateWorkspaceName({ workspaceId, name: normalizedName });
      toast.success("Workspace updated.");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename workspace.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: (typeof workspaceMemberRoles)[number]) => {
    setUpdatingMemberId(memberId);

    try {
      await updateWorkspaceMemberRole({
        workspaceId,
        memberId,
        role,
      });
      toast.success("Member role updated.");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId);

    try {
      await removeWorkspaceMember({ workspaceId, memberId });
      toast.success("Member removed.");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);

    try {
      const maxUses = inviteMaxUses.trim().length > 0 ? Number(inviteMaxUses) : null;

      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
        toast.error("Max uses must be a positive whole number.");
        return;
      }

      const result = await createWorkspaceInvite({
        workspaceId,
        role: inviteRole,
        expiry: inviteExpiry,
        maxUses,
      });

      try {
        await navigator.clipboard.writeText(result.inviteUrl);
        toast.success("Invite link created and copied.");
      } catch {
        toast.success("Invite link created.");
      }
      setIsCreateInviteOpen(false);
      setInviteRole("EDITOR");
      setInviteExpiry("7");
      setInviteMaxUses("");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invite.");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInvite = async (token: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const inviteUrl = new URL(`/invite/${token}`, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Failed to copy invite link.");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);

    try {
      await revokeWorkspaceInvite({ workspaceId, inviteId });
      toast.success("Invite revoked.");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke invite.");
    } finally {
      setRevokingInviteId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            Loading workspace...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            Unable to load this workspace.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {details.workspace.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Role: {details.workspace.currentRole}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/workspaces">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/editor?workspaceId=${workspaceId}`}>Open editor</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Rename workspace (owner only).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            disabled={!details.permissions.canManageWorkspace || isRenaming}
            className="max-w-sm"
          />
          <Button
            onClick={handleRenameWorkspace}
            disabled={!details.permissions.canManageWorkspace || isRenaming}
          >
            {isRenaming ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage roles and member access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!details.permissions.canViewMembers ? (
                <p className="text-sm text-zinc-500">Only editors and owners can view members.</p>
              ) : null}

              {details.permissions.canViewMembers
                ? details.members.map((member) => {
                    const isLastOwner = member.role === "OWNER" && ownerCount <= 1;

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-900">{member.user.name}</p>
                          <p className="text-xs text-zinc-500">{member.user.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{member.role}</Badge>
                          {details.permissions.canManageMembers ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                void handleRoleChange(
                                  member.id,
                                  value as (typeof workspaceMemberRoles)[number]
                                )
                              }
                              disabled={updatingMemberId === member.id}
                            >
                              <SelectTrigger className="h-8 w-[132px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {workspaceMemberRoles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          {details.permissions.canManageMembers ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              onClick={() => void handleRemoveMember(member.id)}
                              disabled={removingMemberId === member.id || isLastOwner}
                              aria-label={`Remove ${member.user.name}`}
                              title={isLastOwner ? "Cannot remove last owner" : "Remove member"}
                            >
                              {removingMemberId === member.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Invite links</CardTitle>
                <CardDescription>Create and revoke invite links.</CardDescription>
              </div>
              {details.permissions.canManageInvites ? (
                <Button onClick={() => setIsCreateInviteOpen(true)}>
                  <Plus className="size-4" />
                  Create invite link
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {!details.permissions.canManageInvites ? (
                <p className="text-sm text-zinc-500">Only owners can manage invite links.</p>
              ) : null}

              {details.permissions.canManageInvites && details.invites.length === 0 ? (
                <p className="text-sm text-zinc-500">No active invites.</p>
              ) : null}

              {details.permissions.canManageInvites
                ? details.invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1 text-xs text-zinc-500">
                        <p>
                          <span className="font-medium text-zinc-900">{invite.role}</span>
                          {" · "}
                          {invite.maxUses
                            ? `${invite.usesCount}/${invite.maxUses} uses`
                            : `${invite.usesCount} uses`}
                        </p>
                        <p>
                          Expires:{" "}
                          {invite.expiresAt
                            ? new Date(invite.expiresAt).toLocaleString()
                            : "Never"}
                        </p>
                        <p>Created {new Date(invite.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCopyInvite(invite.token)}
                        >
                          <Copy className="size-4" />
                          Copy link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRevokeInvite(invite.id)}
                          disabled={revokingInviteId === invite.id}
                        >
                          {revokingInviteId === invite.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))
                : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateInviteOpen} onOpenChange={setIsCreateInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create invite link</DialogTitle>
            <DialogDescription>
              Choose role, expiry, and optional max uses for this link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={inviteRole}
                onValueChange={(value) =>
                  setInviteRole(value as (typeof workspaceInviteRoles)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaceInviteRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Expiry</label>
              <Select
                value={inviteExpiry}
                onValueChange={(value) =>
                  setInviteExpiry(value as (typeof inviteExpiryOptions)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteExpiryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {expiryLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="invite-max-uses">
                Max uses (optional)
              </label>
              <Input
                id="invite-max-uses"
                type="number"
                min={1}
                value={inviteMaxUses}
                onChange={(event) => setInviteMaxUses(event.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateInvite()} disabled={isCreatingInvite}>
              {isCreatingInvite ? <Loader2 className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
