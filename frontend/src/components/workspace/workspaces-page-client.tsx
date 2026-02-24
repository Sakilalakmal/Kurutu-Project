"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWorkspace,
  leaveWorkspace,
  type WorkspaceSummary,
  updateWorkspaceName,
} from "@/lib/workspace/api";
import { WORKSPACE_STORAGE_KEY, type WorkspaceCardData } from "@/lib/workspace/types";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WorkspaceCard } from "@/components/workspace/workspace-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

type WorkspacesPageClientProps = {
  initialWorkspaces: WorkspaceCardData[];
};

type PendingAction = {
  type: "leave" | "delete";
  workspace: WorkspaceCardData;
};

const mapSummaryToCard = (workspace: WorkspaceSummary): WorkspaceCardData => ({
  id: workspace.id,
  name: workspace.name,
  description: workspace.description,
  emojiIcon: workspace.emojiIcon,
  slug: workspace.slug,
  updatedAt: workspace.updatedAt,
  role: workspace.role,
  diagramCount: 0,
  memberCount: 1,
  membersPreview: [],
  lastActivity: null,
});

export function WorkspacesPageClient({ initialWorkspaces }: WorkspacesPageClientProps) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<WorkspaceCardData | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const router = useRouter();

  const filteredWorkspaces = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return workspaces;
    }

    return workspaces.filter((workspace) => {
      const haystack = `${workspace.name} ${workspace.description ?? ""}`.toLowerCase();

      return haystack.includes(normalized);
    });
  }, [searchQuery, workspaces]);

  const isBusy = isRenaming || isActionRunning;

  const handleOpenWorkspace = (workspaceId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }

    router.push(`/editor?workspaceId=${workspaceId}`);
  };

  const handleRenameWorkspace = async () => {
    if (!renameTarget) {
      return;
    }

    const normalizedName = renameValue.trim();

    if (!normalizedName) {
      toast.error("Workspace name is required.");
      return;
    }

    setIsRenaming(true);

    try {
      await updateWorkspaceName({
        workspaceId: renameTarget.id,
        name: normalizedName,
      });

      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === renameTarget.id
            ? {
                ...workspace,
                name: normalizedName,
                updatedAt: new Date().toISOString(),
              }
            : workspace
        )
      );
      setRenameTarget(null);
      setRenameValue("");
      router.refresh();
      toast.success("Workspace renamed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename workspace.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    setIsActionRunning(true);

    try {
      if (pendingAction.type === "leave") {
        await leaveWorkspace({
          workspaceId: pendingAction.workspace.id,
        });
        toast.success("You left the workspace.");
      } else {
        await deleteWorkspace({
          workspaceId: pendingAction.workspace.id,
        });
        toast.success("Workspace deleted.");
      }

      setWorkspaces((current) =>
        current.filter((workspace) => workspace.id !== pendingAction.workspace.id)
      );
      setPendingAction(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : pendingAction.type === "leave"
            ? "Failed to leave workspace."
            : "Failed to delete workspace."
      );
    } finally {
      setIsActionRunning(false);
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Workspaces</h1>
            <p className="text-sm text-muted-foreground">
              Manage your team spaces and diagrams.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isBusy}>
            <Plus className="size-4" />
            Create Workspace
          </Button>
        </header>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search workspaces by name or description"
            className="h-10 pl-9"
            disabled={isBusy}
          />
        </div>

        {workspaces.length === 0 ? (
          <Empty className="min-h-[360px] rounded-2xl border border-dashed border-border/70 bg-card/70">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderKanban className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No workspaces yet</EmptyTitle>
              <EmptyDescription>Create your first collaborative space.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isBusy}>
                <Plus className="size-4" />
                Create Workspace
              </Button>
            </EmptyContent>
          </Empty>
        ) : filteredWorkspaces.length === 0 ? (
          <Empty className="min-h-[280px] rounded-2xl border border-dashed border-border/70 bg-card/70">
            <EmptyHeader>
              <EmptyTitle>No matching workspaces</EmptyTitle>
              <EmptyDescription>Try a different search keyword.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onOpen={handleOpenWorkspace}
                onOpenSettings={(workspaceId) => router.push(`/workspaces/${workspaceId}`)}
                onRename={(targetWorkspace) => {
                  setRenameTarget(targetWorkspace);
                  setRenameValue(targetWorkspace.name);
                }}
                onLeave={(targetWorkspace) =>
                  setPendingAction({
                    type: "leave",
                    workspace: targetWorkspace,
                  })
                }
                onDelete={(targetWorkspace) =>
                  setPendingAction({
                    type: "delete",
                    workspace: targetWorkspace,
                  })
                }
                disableActions={isBusy}
              />
            ))}
          </section>
        )}
      </main>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(workspace) => {
          setWorkspaces((current) => [mapSummaryToCard(workspace), ...current]);
          handleOpenWorkspace(workspace.id);
        }}
      />

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="workspace-rename-input" className="text-sm font-medium">
              Workspace name
            </label>
            <Input
              id="workspace-rename-input"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={80}
              disabled={isRenaming}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRenameWorkspace();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameTarget(null);
                setRenameValue("");
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleRenameWorkspace()} disabled={isRenaming}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete" ? "Delete workspace?" : "Leave workspace?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "delete"
                ? "This action cannot be undone."
                : "You will lose access until someone invites you again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingAction?.type === "delete" ? "destructive" : "default"}
              onClick={() => void handleConfirmAction()}
              disabled={isActionRunning}
            >
              {pendingAction?.type === "delete" ? "Delete" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
