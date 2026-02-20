"use client";

import type { Node } from "@xyflow/react";
import { Check, Eraser, PenLine, Type } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import type { EditorTool } from "@/lib/diagram/types";
import { cn } from "@/lib/utils";

const COLOR_PALETTE = [
  { value: "#111827", label: "Midnight" },
  { value: "#334155", label: "Slate" },
  { value: "#ef4444", label: "Crimson" },
  { value: "#f97316", label: "Tangerine" },
  { value: "#eab308", label: "Amber" },
  { value: "#10b981", label: "Mint" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ffffff", label: "White" },
] as const;

const SHAPE_STYLE_PRESETS = [
  { label: "Bold", fill: "#1d4ed8", stroke: "#111827" },
  { label: "Sunset", fill: "#fb7185", stroke: "#9f1239" },
  { label: "Mint", fill: "#6ee7b7", stroke: "#065f46" },
  { label: "Mono", fill: "#e2e8f0", stroke: "#334155" },
] as const;

const SHAPE_WIDTH_PRESETS = [
  { label: "S", value: 1 },
  { label: "M", value: 2 },
  { label: "L", value: 4 },
] as const;

const FONT_SIZE_PRESETS = [
  { label: "S", value: 14 },
  { label: "M", value: 16 },
  { label: "L", value: 20 },
] as const;

const PEN_WIDTH_PRESETS = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
] as const;

type BrushState = {
  color: string;
  width: number;
  opacity: number;
  eraserEnabled: boolean;
};

type StylePanelProps = {
  activeTool: EditorTool;
  selectedNodes: Node<EditorNodeData>[];
  brush: BrushState;
  onUpdateSelectedShapeStyle: (style: Partial<EditorNodeData["style"]>) => void;
  onUpdateSelectedTextStyle: (style: Partial<EditorNodeData["style"]>) => void;
  onBrushChange: (next: Partial<BrushState>) => void;
};

export function StylePanel({
  activeTool,
  selectedNodes,
  brush,
  onUpdateSelectedShapeStyle,
  onUpdateSelectedTextStyle,
  onBrushChange,
}: StylePanelProps) {
  const selectedTextNodes = selectedNodes.filter((node) => node.type === "textNode");
  const isTextSelection =
    selectedNodes.length > 0 && selectedTextNodes.length === selectedNodes.length;
  const isShapeSelection = selectedNodes.length > 0 && !isTextSelection;
  const selectedReference = selectedNodes[0];
  const style = selectedReference?.data.style;
  const headingDescription =
    activeTool === "pen"
      ? "Draw with brush tools"
      : isShapeSelection
        ? `${selectedNodes.length} shape${selectedNodes.length > 1 ? "s" : ""} selected`
        : isTextSelection
          ? `${selectedNodes.length} text node${selectedNodes.length > 1 ? "s" : ""} selected`
          : "Select a node to style it";

  const renderColorButtons = ({
    keyPrefix,
    selectedColor,
    onSelect,
    ariaLabelPrefix,
  }: {
    keyPrefix: string;
    selectedColor: string | undefined;
    onSelect: (color: string) => void;
    ariaLabelPrefix: string;
  }) => (
    <div className="grid grid-cols-6 gap-2">
      {COLOR_PALETTE.map((entry) => (
        <button
          key={`${keyPrefix}-${entry.value}`}
          type="button"
          aria-label={`${ariaLabelPrefix} ${entry.label}`}
          className={cn(
            "relative h-7 w-7 rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            selectedColor === entry.value
              ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
              : "ring-0",
            entry.value === "#ffffff"
              ? "border-zinc-300 dark:border-zinc-500"
              : "border-black/10 dark:border-white/10"
          )}
          style={{ backgroundColor: entry.value }}
          onClick={() => onSelect(entry.value)}
        >
          {selectedColor === entry.value ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Check className="size-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );

  const renderSizeButtons = ({
    keyPrefix,
    value,
    options,
    onSelect,
  }: {
    keyPrefix: string;
    value: number;
    options: readonly { label: string; value: number }[];
    onSelect: (value: number) => void;
  }) => (
    <div className="grid grid-cols-3 gap-2">
      {options.map((preset) => (
        <button
          key={`${keyPrefix}-${preset.label}`}
          type="button"
          className={cn(
            "rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors",
            value === preset.value
              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-200"
              : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          )}
          onClick={() => onSelect(preset.value)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );

  return (
    <Card className="rounded-2xl border-zinc-200/80 bg-white/90 p-3 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.75)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mb-3 rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-100/80 p-2.5 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900/60">
        <div className="mb-1 flex items-center gap-2">
          {activeTool === "pen" ? <PenLine className="size-4" /> : <Type className="size-4" />}
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Style</h2>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{headingDescription}</p>
      </div>

      {activeTool === "pen" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Brush color</p>
            {renderColorButtons({
              keyPrefix: "brush",
              selectedColor: brush.color,
              onSelect: (color) => onBrushChange({ color, eraserEnabled: false }),
              ariaLabelPrefix: "Brush color",
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Brush size</p>
              <Toggle
                size="sm"
                variant="outline"
                pressed={brush.eraserEnabled}
                onPressedChange={(pressed) => onBrushChange({ eraserEnabled: pressed })}
                aria-label="Toggle eraser"
                className="h-7 rounded-lg border-zinc-200 px-2.5 text-[11px] dark:border-zinc-700"
              >
                <Eraser className="size-3.5" />
                Eraser
              </Toggle>
            </div>
            {renderSizeButtons({
              keyPrefix: "brush-width",
              value: brush.width,
              options: PEN_WIDTH_PRESETS,
              onSelect: (value) => onBrushChange({ width: value, eraserEnabled: false }),
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Opacity {Math.round(brush.opacity * 100)}%
            </p>
            <Slider
              value={[brush.opacity]}
              min={0.1}
              max={1}
              step={0.05}
              onValueChange={(value) => onBrushChange({ opacity: value[0], eraserEnabled: false })}
            />
          </div>
        </div>
      ) : null}

      {activeTool !== "pen" && isShapeSelection ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Style presets</p>
            <div className="grid grid-cols-2 gap-2">
              {SHAPE_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    style?.fill === preset.fill && style?.stroke === preset.stroke
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/60 dark:text-blue-200"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  )}
                  onClick={() =>
                    onUpdateSelectedShapeStyle({
                      fill: preset.fill,
                      stroke: preset.stroke,
                    })
                  }
                >
                  <span>{preset.label}</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: preset.fill }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/15"
                      style={{ backgroundColor: preset.stroke }}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Fill</p>
            {renderColorButtons({
              keyPrefix: "fill",
              selectedColor: style?.fill,
              onSelect: (color) => onUpdateSelectedShapeStyle({ fill: color }),
              ariaLabelPrefix: "Fill color",
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Stroke</p>
            {renderColorButtons({
              keyPrefix: "stroke",
              selectedColor: style?.stroke,
              onSelect: (color) => onUpdateSelectedShapeStyle({ stroke: color }),
              ariaLabelPrefix: "Stroke color",
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Stroke width</p>
            {renderSizeButtons({
              keyPrefix: "shape-width",
              value: style?.strokeWidth ?? 1,
              options: SHAPE_WIDTH_PRESETS,
              onSelect: (value) => onUpdateSelectedShapeStyle({ strokeWidth: value }),
            })}
          </div>
        </div>
      ) : null}

      {activeTool !== "pen" && isTextSelection ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Text color</p>
            {renderColorButtons({
              keyPrefix: "text",
              selectedColor: style?.textColor,
              onSelect: (color) => onUpdateSelectedTextStyle({ textColor: color }),
              ariaLabelPrefix: "Text color",
            })}
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white/70 p-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">Text size</p>
            {renderSizeButtons({
              keyPrefix: "font-size",
              value: style?.fontSize ?? 16,
              options: FONT_SIZE_PRESETS,
              onSelect: (value) => onUpdateSelectedTextStyle({ fontSize: value }),
            })}
          </div>
        </div>
      ) : null}

      {activeTool !== "pen" && selectedNodes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
          Select a shape/text node or switch to Pen for brush controls.
        </p>
      ) : null}
    </Card>
  );
}
