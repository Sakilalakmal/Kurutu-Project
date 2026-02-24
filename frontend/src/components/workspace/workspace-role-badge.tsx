"use client";

import type { WorkspaceMemberRole } from "@/lib/workspace/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const roleClassName: Record<WorkspaceMemberRole, string> = {
  OWNER:
    "border-amber-300/70 bg-amber-100/80 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  EDITOR:
    "border-sky-300/70 bg-sky-100/80 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
  VIEWER:
    "border-zinc-300/80 bg-zinc-100/80 text-zinc-700 dark:border-zinc-600/70 dark:bg-zinc-700/20 dark:text-zinc-300",
};

type WorkspaceRoleBadgeProps = {
  role: WorkspaceMemberRole;
  className?: string;
};

export function WorkspaceRoleBadge({ role, className }: WorkspaceRoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em]",
        roleClassName[role],
        className
      )}
    >
      {role}
    </Badge>
  );
}
