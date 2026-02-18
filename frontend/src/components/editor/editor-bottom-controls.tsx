"use client";

import type { ReactNode } from "react";
import {
  GitBranch,
  Grid2X2,
  Magnet,
  Minus,
  Plus,
  Redo2,
  Scan,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DiagramEdgeType } from "@/lib/diagram/types";

type EditorBottomControlsProps = {
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  gridVisible: boolean;
  snapEnabled: boolean;
  defaultEdgeType: DiagramEdgeType;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleGridVisible: () => void;
  onToggleSnap: () => void;
  onToggleEdgeType: () => void;
  className?: string;
};

export function EditorBottomControls({
  zoom,
  canUndo,
  canRedo,
  gridVisible,
  snapEnabled,
  defaultEdgeType,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGridVisible,
  onToggleSnap,
  onToggleEdgeType,
  className,
}: EditorBottomControlsProps) {
  const controlButtonClass =
    "h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500";

  const toggleButtonClass =
    "h-9 w-9 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500";

  const renderTooltipButton = ({
    label,
    active = false,
    disabled = false,
    onClick,
    icon,
  }: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    icon: ReactNode;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          disabled={disabled}
          className={cn(
            active
              ? `${toggleButtonClass} bg-zinc-900 text-white hover:bg-zinc-800`
              : controlButtonClass
          )}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.7)] backdrop-blur",
          className
        )}
      >
        {renderTooltipButton({
          label: "Undo (Ctrl/Cmd+Z)",
          disabled: !canUndo,
          onClick: onUndo,
          icon: <Undo2 className="size-3.5" />,
        })}
        {renderTooltipButton({
          label: "Redo (Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y)",
          disabled: !canRedo,
          onClick: onRedo,
          icon: <Redo2 className="size-3.5" />,
        })}
        {renderTooltipButton({
          label: "Zoom out",
          onClick: onZoomOut,
          icon: <Minus className="size-3.5" />,
        })}
        <span className="min-w-14 text-center text-xs font-medium text-zinc-600">
          {Math.round(zoom * 100)}%
        </span>
        {renderTooltipButton({
          label: "Zoom in",
          onClick: onZoomIn,
          icon: <Plus className="size-3.5" />,
        })}
        {renderTooltipButton({
          label: "Fit view",
          onClick: onFitView,
          icon: <Scan className="size-3.5" />,
        })}
        {renderTooltipButton({
          label: "Toggle grid visibility",
          active: gridVisible,
          onClick: onToggleGridVisible,
          icon: <Grid2X2 className="size-3.5" />,
        })}
        {renderTooltipButton({
          label: "Toggle snap to grid",
          active: snapEnabled,
          onClick: onToggleSnap,
          icon: <Magnet className="size-3.5" />,
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Toggle default edge type"
              className={cn(
                "h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500",
                defaultEdgeType === "straight" && "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
              onClick={onToggleEdgeType}
            >
              <GitBranch className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Default edge: {defaultEdgeType === "smoothstep" ? "smoothstep" : "straight"}
          </TooltipContent>
        </Tooltip>
      </Card>
    </TooltipProvider>
  );
}
