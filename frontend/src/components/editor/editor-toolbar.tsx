"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  Circle,
  MousePointer2,
  PenTool,
  Search,
  Shapes,
  Square,
  StickyNote,
  Type,
  Wrench,
} from "lucide-react";
import {
  ASSET_CATALOG,
  ASSET_CATEGORIES,
  ASSET_DRAG_MIME,
  type AssetCategory,
} from "@/lib/assets/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EditorTool } from "@/lib/diagram/types";

type EditorToolbarProps = {
  activeTool: EditorTool;
  onToolSelect: (tool: EditorTool) => void;
  onAssetInsert: (assetId: string) => void;
};

const tools: Array<{
  id: EditorTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}> = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "sticky", label: "Sticky note", icon: StickyNote },
  { id: "text", label: "Text", icon: Type },
  { id: "pen", label: "Pen", icon: PenTool },
];

const groupAssets = (
  query: string
): Array<{
  category: AssetCategory;
  items: typeof ASSET_CATALOG;
}> => {
  const normalizedQuery = query.trim().toLowerCase();

  return ASSET_CATEGORIES.map((category) => {
    const items = ASSET_CATALOG.filter((asset) => {
      if (asset.category !== category) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        asset.name.toLowerCase().includes(normalizedQuery) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });

    return { category, items };
  }).filter((entry) => entry.items.length > 0);
};

export function EditorToolbar({
  activeTool,
  onToolSelect,
  onAssetInsert,
}: EditorToolbarProps) {
  const [assetSearch, setAssetSearch] = useState("");
  const groupedAssets = useMemo(() => groupAssets(assetSearch), [assetSearch]);

  return (
    <TooltipProvider>
      <Card className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.7)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <Tabs defaultValue="tools" className="flex h-full flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-100 dark:bg-zinc-900">
            <TabsTrigger value="tools" className="gap-1.5">
              <Wrench className="size-3.5" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="assets" className="gap-1.5">
              <Shapes className="size-3.5" />
              Assets
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tools" className="mt-2 min-h-0 flex-1">
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const active = activeTool === tool.id;

                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={tool.label}
                        aria-pressed={active}
                        disabled={tool.disabled}
                        className={cn(
                          "h-10 justify-start gap-2 rounded-xl px-3 text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                          "focus-visible:ring-2 focus-visible:ring-blue-500",
                          active &&
                            "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        )}
                        onClick={() => onToolSelect(tool.id)}
                      >
                        <Icon className="size-4" />
                        <span className="truncate text-xs">{tool.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {tool.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="assets" className="mt-2 min-h-0 flex-1">
            <div className="mb-2 space-y-2">
              <label className="sr-only" htmlFor="asset-search">
                Search assets
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-zinc-400" />
                <Input
                  id="asset-search"
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                  placeholder="Search assets"
                  className="h-9 rounded-lg pl-8 text-sm"
                  aria-label="Search assets"
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-20rem)] pr-2">
              <div className="space-y-4 pb-1">
                {groupedAssets.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No assets match your search.
                  </p>
                ) : null}
                {groupedAssets.map((group, index) => (
                  <section key={group.category} aria-label={`${group.category} assets`}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
                        {group.category}
                      </h3>
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                        {group.items.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.items.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "copy";
                            event.dataTransfer.setData(ASSET_DRAG_MIME, asset.id);
                            event.dataTransfer.setData("text/plain", asset.id);
                          }}
                          onClick={() => onAssetInsert(asset.id)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900",
                            "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_12px_24px_-20px_rgba(15,23,42,0.7)] dark:hover:border-zinc-600",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          )}
                          aria-label={`Insert ${asset.name}`}
                        >
                          <span className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                            {asset.name}
                          </span>
                          <span className="text-[10px] tracking-wide text-zinc-400 uppercase">
                            drag
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </TooltipProvider>
  );
}
