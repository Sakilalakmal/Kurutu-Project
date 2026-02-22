"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { fetchActivityPage, type WorkspaceActivityItem } from "@/lib/activity/api";
import type {
  ActivityFilterValue,
  ActivityScopeValue,
} from "@/lib/activity/types";
import { keys } from "@/lib/query/keys";
import { getUserPresenceColor } from "@/lib/realtime/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ActivityTerminalDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  diagramId: string | null;
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const toRoleLabel = (value: string | null | undefined) => {
  if (!value) {
    return "Member";
  }

  return `${value.slice(0, 1)}${value.slice(1).toLowerCase()}`;
};

const resolveActorRole = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const actorRole = (metadata as Record<string, unknown>).actorRole;

  return typeof actorRole === "string" ? actorRole : null;
};

const resolveActionClassName = (actionType: string) => {
  if (
    actionType.includes("DELETE") ||
    actionType.includes("REVOKE") ||
    actionType.includes("REMOVE")
  ) {
    return "text-red-500 dark:text-red-400";
  }

  if (
    actionType.includes("CREATE") ||
    actionType.includes("ADD") ||
    actionType.includes("JOIN")
  ) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  return "text-sky-600 dark:text-sky-400";
};

export function ActivityTerminalDrawer({
  open,
  onOpenChange,
  workspaceId,
  diagramId,
}: ActivityTerminalDrawerProps) {
  const [scope, setScope] = useState<ActivityScopeValue>("workspace");
  const [filter, setFilter] = useState<ActivityFilterValue>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const effectiveScope: ActivityScopeValue =
    scope === "diagram" && !diagramId ? "workspace" : scope;
  const selectedDiagramId = effectiveScope === "diagram" ? diagramId : undefined;
  const queryEnabled =
    open &&
    Boolean(workspaceId) &&
    (effectiveScope === "workspace" || Boolean(diagramId));

  const activityQuery = useInfiniteQuery({
    queryKey: workspaceId
      ? keys.activityLogs({
          workspaceId,
          diagramId: selectedDiagramId,
          filter,
          search,
        })
      : ["activity", "logs", "disabled"],
    queryFn: ({ pageParam }) =>
      fetchActivityPage({
        workspaceId: workspaceId as string,
        diagramId: selectedDiagramId,
        cursor: pageParam,
        filter,
        search: search.length > 0 ? search : undefined,
      }),
    enabled: queryEnabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: queryEnabled ? 5_000 : false,
  });

  useEffect(() => {
    if (!open || !queryEnabled) {
      return;
    }

    void activityQuery.refetch();
  }, [activityQuery, open, queryEnabled]);

  const newestFirstActivities = useMemo(() => {
    const pages = activityQuery.data?.pages ?? [];
    const deduped = new Map<string, WorkspaceActivityItem>();

    for (const page of pages) {
      for (const activity of page.activities) {
        if (!deduped.has(activity.id)) {
          deduped.set(activity.id, activity);
        }
      }
    }

    return Array.from(deduped.values());
  }, [activityQuery.data?.pages]);

  const oldestFirstActivities = useMemo(
    () => [...newestFirstActivities].reverse(),
    [newestFirstActivities]
  );

  useEffect(() => {
    if (!open || !listRef.current || activityQuery.isFetchingNextPage) {
      return;
    }

    requestAnimationFrame(() => {
      if (!listRef.current) {
        return;
      }

      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, [activityQuery.isFetchingNextPage, effectiveScope, filter, oldestFirstActivities.length, open]);

  const handleLoadOlder = useCallback(async () => {
    if (!activityQuery.hasNextPage || activityQuery.isFetchingNextPage) {
      return;
    }

    const container = listRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;

    await activityQuery.fetchNextPage();

    requestAnimationFrame(() => {
      if (!container) {
        return;
      }

      const nextScrollHeight = container.scrollHeight;
      container.scrollTop = previousScrollTop + (nextScrollHeight - previousScrollHeight);
    });
  }, [activityQuery]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[40vh] min-h-[300px] max-h-[70vh] border-zinc-200 bg-zinc-50/95 p-0 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <SheetHeader className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="font-mono text-sm tracking-wide">Activity Log</SheetTitle>
            <SheetClose asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-7 w-7 rounded-md"
                aria-label="Close activity log"
              >
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
              <Button
                size="sm"
                variant={effectiveScope === "workspace" ? "default" : "ghost"}
                className="h-7 rounded-sm px-2 text-xs"
                onClick={() => setScope("workspace")}
              >
                Workspace
              </Button>
              <Button
                size="sm"
                variant={effectiveScope === "diagram" ? "default" : "ghost"}
                className="h-7 rounded-sm px-2 text-xs"
                onClick={() => setScope("diagram")}
                disabled={!diagramId}
              >
                This diagram
              </Button>
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ActivityFilterValue)}
              className="h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Activity filter"
            >
              <option value="all">All</option>
              <option value="diagram">Diagram</option>
              <option value="members">Members</option>
              <option value="invites">Invites</option>
            </select>

            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search actor or entity"
              className="h-7 max-w-[240px] text-xs"
              aria-label="Search activity"
            />
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100%-7.5rem)] flex-col">
          {activityQuery.hasNextPage ? (
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-full font-mono text-xs"
                onClick={() => {
                  void handleLoadOlder();
                }}
                disabled={activityQuery.isFetchingNextPage}
              >
                {activityQuery.isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading older...
                  </>
                ) : (
                  "Load older"
                )}
              </Button>
            </div>
          ) : null}

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm [scrollbar-width:thin]"
          >
            {!workspaceId ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                Select a workspace to view activity.
              </p>
            ) : null}

            {workspaceId && effectiveScope === "diagram" && !diagramId ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No diagram is active in this editor session.
              </p>
            ) : null}

            {queryEnabled && activityQuery.isLoading ? (
              <p className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="size-3.5 animate-spin" />
                Loading activity...
              </p>
            ) : null}

            {queryEnabled && activityQuery.isError ? (
              <p className="text-red-500 dark:text-red-400">
                {activityQuery.error instanceof Error
                  ? activityQuery.error.message
                  : "Failed to load activity."}
              </p>
            ) : null}

            {queryEnabled &&
            !activityQuery.isLoading &&
            !activityQuery.isError &&
            oldestFirstActivities.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No activity found for this filter.
              </p>
            ) : null}

            <div className="space-y-1">
              {oldestFirstActivities.map((activity) => {
                const actorColor = getUserPresenceColor(activity.actor.id);
                const actorRole = toRoleLabel(resolveActorRole(activity.metadata));
                const actionClassName = resolveActionClassName(activity.actionType);

                return (
                  <p key={activity.id} className="whitespace-pre-wrap break-words leading-6">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      [{formatTimestamp(activity.createdAt)}]
                    </span>{" "}
                    <span style={{ color: actorColor }} className="font-medium">
                      {activity.actor.name}
                    </span>{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      ({actorRole})
                    </span>{" "}
                    <span className={cn("font-medium", actionClassName)}>{activity.summary}</span>
                  </p>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {queryEnabled ? "Live (polling every 5s)" : "Disconnected"}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
