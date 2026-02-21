"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listMyWorkspaces,
  type WorkspaceSummary,
} from "@/lib/workspace/api";
import { WORKSPACE_STORAGE_KEY } from "@/lib/workspace/types";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type WorkspaceSwitcherProps = {
  currentWorkspaceId: string | null;
  className?: string;
  onWorkspaceChange?: (workspaceId: string | null) => void;
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  className,
  onWorkspaceChange,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null,
    [currentWorkspaceId, workspaces]
  );

  const applyWorkspaceSelection = (workspaceId: string | null) => {
    if (typeof window !== "undefined") {
      if (workspaceId) {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
      } else {
        window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (workspaceId) {
      nextParams.set("workspaceId", workspaceId);
    } else {
      nextParams.delete("workspaceId");
    }

    const queryString = nextParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
    onWorkspaceChange?.(workspaceId);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 min-w-44 justify-between gap-2", className)}
          >
            <span className="truncate">
              {currentWorkspace?.name ?? (isLoading ? "Loading workspaces..." : "Personal")}
            </span>
            <ChevronsUpDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => applyWorkspaceSelection(null)}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate">Personal</span>
              {currentWorkspaceId === null ? <Check className="size-4" /> : null}
            </div>
          </DropdownMenuItem>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => applyWorkspaceSelection(workspace.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{workspace.name}</span>
                {workspace.id === currentWorkspaceId ? <Check className="size-4" /> : null}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            Create workspace
          </DropdownMenuItem>
          {currentWorkspaceId ? (
            <DropdownMenuItem asChild>
              <Link href={`/workspaces/${currentWorkspaceId}`}>Manage workspace</Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href="/workspaces">All workspaces</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={(workspace) => {
          setWorkspaces((current) => [workspace, ...current]);
          applyWorkspaceSelection(workspace.id);
        }}
      />
    </>
  );
}
