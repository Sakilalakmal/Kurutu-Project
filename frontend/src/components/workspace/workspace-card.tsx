"use client";

import { formatDistanceToNow } from "date-fns";
import { BarChart3, Ellipsis, Settings2, Users } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { WorkspaceCardData } from "@/lib/workspace/types";
import { WorkspaceRoleBadge } from "@/components/workspace/workspace-role-badge";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type WorkspaceCardProps = {
  workspace: WorkspaceCardData;
  onOpen: (workspaceId: string) => void;
  onOpenSettings: (workspaceId: string) => void;
  onRename: (workspace: WorkspaceCardData) => void;
  onLeave: (workspace: WorkspaceCardData) => void;
  onDelete: (workspace: WorkspaceCardData) => void;
  disableActions?: boolean;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

const formatRelativeTime = (dateInput: string) => {
  const parsed = new Date(dateInput);

  if (Number.isNaN(parsed.getTime())) {
    return "recently";
  }

  return formatDistanceToNow(parsed, { addSuffix: true });
};

export function WorkspaceCard({
  workspace,
  onOpen,
  onOpenSettings,
  onRename,
  onLeave,
  onDelete,
  disableActions = false,
}: WorkspaceCardProps) {
  const previewMembers = workspace.membersPreview.slice(0, 4);
  const hiddenMembers = Math.max(workspace.memberCount - previewMembers.length, 0);
  const updatedLabel = formatRelativeTime(workspace.updatedAt);

  const stopCardNavigation = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  };

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => onOpen(workspace.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(workspace.id);
        }
      }}
      className={cn(
        "group relative cursor-pointer gap-0 overflow-hidden border-border/60 bg-card/80 py-0 shadow-none transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_20px_45px_-32px_rgba(15,23,42,0.88)]",
        "dark:hover:shadow-[0_20px_45px_-34px_rgba(0,0,0,0.95)]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <CardHeader className="space-y-3 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="line-clamp-1 text-lg font-semibold">
              <span className="inline-flex items-center gap-2">
                {workspace.emojiIcon ? (
                  <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted/70 text-sm">
                    {workspace.emojiIcon}
                  </span>
                ) : null}
                <span className="line-clamp-1">{workspace.name}</span>
              </span>
            </CardTitle>
            {workspace.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{workspace.description}</p>
            ) : null}
          </div>
          <WorkspaceRoleBadge role={workspace.role} />
        </div>
        <p className="text-xs text-muted-foreground">Updated {updatedLabel}</p>
      </CardHeader>

      <CardContent className="space-y-4 border-y border-border/60 px-5 py-4">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/35 px-2.5 py-2">
            <BarChart3 className="size-3.5" />
            <span>{workspace.diagramCount} diagrams</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/35 px-2.5 py-2">
            <Users className="size-3.5" />
            <span>{workspace.memberCount} members</span>
          </div>
        </div>

        <div className="space-y-2">
          <AvatarGroup className="*:data-[slot=avatar]:size-7 *:data-[slot=avatar]:ring-2">
            {previewMembers.map((member) => (
              <Avatar key={member.id} size="sm">
                <AvatarImage src={member.image ?? undefined} alt={member.name} />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
            ))}
            {hiddenMembers > 0 ? <AvatarGroupCount className="size-7 text-xs">+{hiddenMembers}</AvatarGroupCount> : null}
          </AvatarGroup>
          {workspace.lastActivity ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              Last activity: {workspace.lastActivity.actorName} {workspace.lastActivity.summary}
            </p>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-2 px-5 py-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(event) => {
              stopCardNavigation(event);
              onOpen(workspace.id);
            }}
            disabled={disableActions}
          >
            Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              stopCardNavigation(event);
              onOpenSettings(workspace.id);
            }}
            disabled={disableActions}
          >
            <Settings2 className="size-4" />
            Settings
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(event) => stopCardNavigation(event)}
              disabled={disableActions}
              aria-label={`Workspace actions for ${workspace.name}`}
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRename(workspace);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onLeave(workspace);
              }}
            >
              Leave workspace
            </DropdownMenuItem>
            {workspace.role === "OWNER" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(workspace);
                  }}
                >
                  Delete workspace
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
