"use client";

import {
  Circle,
  MousePointer2,
  PenTool,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EditorTool } from "@/lib/diagram/types";
import type { ComponentType } from "react";

type EditorToolbarProps = {
  activeTool: EditorTool;
  onToolSelect: (tool: EditorTool) => void;
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
  { id: "text", label: "Text (coming soon)", icon: Type, disabled: true },
  { id: "pen", label: "Pen (coming soon)", icon: PenTool, disabled: true },
];

export function EditorToolbar({ activeTool, onToolSelect }: EditorToolbarProps) {
  return (
    <TooltipProvider>
      <Card className="flex w-14 flex-col items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/90 p-2 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.7)] backdrop-blur">
        {tools.map((tool, index) => {
          const Icon = tool.icon;

          return (
            <div key={tool.id} className="flex w-full flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                    disabled={tool.disabled}
                    className={cn(
                      "h-9 w-9 rounded-xl text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900",
                      "focus-visible:ring-2 focus-visible:ring-blue-500",
                      activeTool === tool.id && "bg-zinc-900 text-white hover:bg-zinc-800"
                    )}
                    onClick={() => onToolSelect(tool.id)}
                  >
                    <Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {tool.label}
                </TooltipContent>
              </Tooltip>
              {index === 0 ? <Separator className="my-0.5 w-8" /> : null}
            </div>
          );
        })}
      </Card>
    </TooltipProvider>
  );
}
