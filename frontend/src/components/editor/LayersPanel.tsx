"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Layers3,
  Lock,
  Plus,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { DiagramLayer } from "@/lib/diagram/types";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  layers: DiagramLayer[];
  activeLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onMoveLayer: (layerId: string, direction: "up" | "down") => void;
  onAddLayer: () => void;
  headerAction?: ReactNode;
};

export function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onRenameLayer,
  onToggleVisibility,
  onToggleLock,
  onMoveLayer,
  onAddLayer,
  headerAction,
}: LayersPanelProps) {
  const orderedLayers = [...layers].sort((a, b) => a.order - b.order);

  return (
    <Card className="flex h-full min-h-[420px] w-full flex-col rounded-2xl border-zinc-200/80 bg-white/90 p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Layers3 className="size-4" />
          Layers
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-cyan-700 bg-cyan-600 text-xs text-white shadow-[0_10px_20px_-14px_rgba(8,145,178,0.95)] hover:bg-cyan-500 active:bg-cyan-700 dark:border-cyan-300 dark:bg-cyan-400 dark:text-zinc-950 dark:hover:bg-cyan-300"
            onClick={onAddLayer}
          >
            <Plus className="size-3.5" />
            Add layer
          </Button>
          {headerAction}
        </div>
      </div>
      <Separator />
      <ScrollArea className="mt-3 flex-1 pr-1">
        <div className="space-y-2">
          {orderedLayers.map((layer, index) => (
            <div
              key={layer.id}
              className={cn(
                "rounded-xl border p-2 transition-colors",
                layer.id === activeLayerId
                  ? "border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-700 dark:bg-zinc-900/70"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectLayer(layer.id)}
                className="mb-2 flex w-full items-center justify-between text-left"
              >
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {layer.id === activeLayerId ? "Active" : "Layer"}
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">#{index + 1}</span>
              </button>
              <Input
                value={layer.name}
                onChange={(event) => onRenameLayer(layer.id, event.target.value)}
                onFocus={() => onSelectLayer(layer.id)}
                className="h-8 border-zinc-200 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                aria-label={`${layer.name} name`}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => onToggleVisibility(layer.id)}
                    aria-label={layer.isVisible ? "Hide layer" : "Show layer"}
                  >
                    {layer.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => onToggleLock(layer.id)}
                    aria-label={layer.isLocked ? "Unlock layer" : "Lock layer"}
                  >
                    {layer.isLocked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => onMoveLayer(layer.id, "up")}
                    disabled={index === 0}
                    aria-label="Move layer up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => onMoveLayer(layer.id, "down")}
                    disabled={index === orderedLayers.length - 1}
                    aria-label="Move layer down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
