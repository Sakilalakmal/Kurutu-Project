"use client";

import { Grid2X2, Minus, Scan, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EditorBottomControlsProps = {
  zoom: number;
  gridEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleGrid: () => void;
  className?: string;
};

export function EditorBottomControls({
  zoom,
  gridEnabled,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGrid,
  className,
}: EditorBottomControlsProps) {
  return (
    <Card
      className={cn(
        "absolute bottom-3 left-1/2 z-20 w-14 -translate-x-1/2 items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.7)] backdrop-blur",
        className
      )}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Zoom out"
        className="h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onZoomOut}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="min-w-14 text-center text-xs font-medium text-zinc-600">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Zoom in"
        className="h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onZoomIn}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Fit view"
        className="h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={onFitView}
      >
        <Scan className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Toggle grid"
        className={cn(
          "h-9 w-9 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500",
          gridEnabled
            ? "bg-zinc-900 text-white hover:bg-zinc-800"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        )}
        onClick={onToggleGrid}
      >
        <Grid2X2 className="size-3.5" />
      </Button>
    </Card>
  );
}
