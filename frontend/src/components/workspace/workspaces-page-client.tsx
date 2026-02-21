"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listMyWorkspaces,
  type WorkspaceSummary,
} from "@/lib/workspace/api";
import { WORKSPACE_STORAGE_KEY } from "@/lib/workspace/types";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspacesPageClient() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const loadWorkspaces = async () => {
      try {
        const result = await listMyWorkspaces();

        if (!cancelled) {
          setWorkspaces(result);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load workspaces.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenWorkspace = (workspaceId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }

    router.push(`/editor?workspaceId=${workspaceId}`);
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Workspaces</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create, open, and manage your team workspaces.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Create workspace
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <Card className="sm:col-span-2">
            <CardContent className="py-8 text-center text-sm text-zinc-500">
              Loading workspaces...
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && workspaces.length === 0 ? (
          <Card className="sm:col-span-2">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-sm text-zinc-500">No workspaces yet.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>Create your first workspace</Button>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading
          ? workspaces.map((workspace) => (
              <Card key={workspace.id} className="border-zinc-200/80 dark:border-zinc-800">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base">{workspace.name}</CardTitle>
                    <Badge variant="secondary">{workspace.role}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleOpenWorkspace(workspace.id)}>
                    <Building2 className="size-4" />
                    Open in editor
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/workspaces/${workspace.id}`}>Settings</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          : null}
      </section>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(workspace) => {
          setWorkspaces((current) => [workspace, ...current]);
          handleOpenWorkspace(workspace.id);
        }}
      />
    </main>
  );
}