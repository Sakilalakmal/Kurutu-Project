"use client";

import { useEffect, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { RuntimeRelationEdgeData } from "@/lib/diagram/mapper";
import { resolveRelationSideMaximum } from "@/lib/diagram/relations";
import type { RelationType } from "@/lib/diagram/types";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

const SCALE = 7;
const BAR = 6;
const CROW = 7;
const CIRCLE = 3.5;

const toUnit = (from: Point, to: Point) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: dx / length,
    y: dy / length,
  };
};

const drawBar = (center: Point, perp: Point) => {
  const half = BAR / 2;

  return `M ${center.x + perp.x * half} ${center.y + perp.y * half} L ${center.x - perp.x * half} ${center.y - perp.y * half}`;
};

const drawCircle = (center: Point) => (
  <circle
    key={`circle-${center.x}-${center.y}`}
    cx={center.x}
    cy={center.y}
    r={CIRCLE}
    fill="#ffffff"
    stroke="currentColor"
    strokeWidth={1.3}
  />
);

const drawCrow = (center: Point, dir: Point, perp: Point) => {
  const forward = {
    x: center.x + dir.x * CROW,
    y: center.y + dir.y * CROW,
  };
  const up = {
    x: center.x + dir.x * (CROW * 0.8) + perp.x * (CROW * 0.75),
    y: center.y + dir.y * (CROW * 0.8) + perp.y * (CROW * 0.75),
  };
  const down = {
    x: center.x + dir.x * (CROW * 0.8) - perp.x * (CROW * 0.75),
    y: center.y + dir.y * (CROW * 0.8) - perp.y * (CROW * 0.75),
  };

  return `M ${center.x} ${center.y} L ${forward.x} ${forward.y} M ${center.x} ${center.y} L ${up.x} ${up.y} M ${center.x} ${center.y} L ${down.x} ${down.y}`;
};

function SideGlyph({
  anchor,
  direction,
  optional,
  maximum,
}: {
  anchor: Point;
  direction: Point;
  optional: boolean;
  maximum: "one" | "many";
}) {
  const perp = { x: -direction.y, y: direction.x };
  const minCenter = {
    x: anchor.x + direction.x * (SCALE * 1.2),
    y: anchor.y + direction.y * (SCALE * 1.2),
  };
  const maxCenter = {
    x: anchor.x + direction.x * (SCALE * 0.1),
    y: anchor.y + direction.y * (SCALE * 0.1),
  };

  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
      {optional ? drawCircle(minCenter) : <path d={drawBar(minCenter, perp)} />}
      {maximum === "one" ? <path d={drawBar(maxCenter, perp)} /> : <path d={drawCrow(maxCenter, direction, perp)} />}
    </g>
  );
}

const RELATION_TYPE_OPTIONS: Array<{ value: RelationType; label: string }> = [
  { value: "one-to-many", label: "1..*" },
  { value: "one-to-one", label: "1..1" },
  { value: "many-to-many", label: "*..*" },
];

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps) {
  const relationData = (data as RuntimeRelationEdgeData | undefined) ?? undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const relationType = relationData?.relationType ?? "one-to-many";
  const fromOptional = Boolean(relationData?.fromOptional);
  const toOptional = Boolean(relationData?.toOptional);
  const isHovered = Boolean(relationData?.isHovered);
  const isConnectedToHoveredNode = Boolean(relationData?.isConnectedToHoveredNode);
  const isDimmed = Boolean(relationData?.isDimmed);
  const strokeColor = isHovered ? "#0ea5e9" : selected ? "#2563eb" : "#334155";
  const strokeWidth = isHovered ? 3.2 : selected ? 2.8 : isConnectedToHoveredNode ? 2.4 : 1.7;
  const opacity = isDimmed ? 0.35 : 1;

  const source = { x: sourceX, y: sourceY };
  const target = { x: targetX, y: targetY };
  const sourceDir = toUnit(source, target);
  const targetDir = toUnit(target, source);
  const sourceAnchor = {
    x: source.x + sourceDir.x * SCALE,
    y: source.y + sourceDir.y * SCALE,
  };
  const targetAnchor = {
    x: target.x + targetDir.x * SCALE,
    y: target.y + targetDir.y * SCALE,
  };

  const fromMaximum = resolveRelationSideMaximum(relationType, "from");
  const toMaximum = resolveRelationSideMaximum(relationType, "to");
  const labelMode = relationData?.labelMode ?? "auto";
  const label = relationData?.label ?? "";
  const [draftCustomLabel, setDraftCustomLabel] = useState(label);

  useEffect(() => {
    setDraftCustomLabel(label);
  }, [label]);

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity,
        }}
      />
      <g
        className="pointer-events-none"
        style={{
          color: strokeColor,
          opacity,
        }}
      >
        <SideGlyph
          anchor={sourceAnchor}
          direction={sourceDir}
          optional={fromOptional}
          maximum={fromMaximum}
        />
        <SideGlyph
          anchor={targetAnchor}
          direction={targetDir}
          optional={toOptional}
          maximum={toMaximum}
        />
      </g>
      <EdgeLabelRenderer>
        {label ? (
          <div
            className="pointer-events-none absolute rounded-md border border-zinc-300 bg-white/95 px-2 py-0.5 text-[11px] font-medium text-zinc-700 shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 16}px)`,
            }}
          >
            {label}
          </div>
        ) : null}
        {selected && !relationData?.readOnly ? (
          <div
            className="pointer-events-auto absolute w-[220px] rounded-lg border border-zinc-300 bg-white p-2 shadow-[0_18px_38px_-26px_rgba(15,23,42,0.75)]"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 34}px)`,
            }}
          >
            <div className="space-y-2">
              <label className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-zinc-600">Relation</span>
                <select
                  className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px]"
                  value={relationType}
                  onChange={(event) =>
                    relationData?.onRelationDataChange?.(id, {
                      relationType: event.target.value as RelationType,
                    })
                  }
                >
                  {RELATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-zinc-600">From optional</span>
                <input
                  type="checkbox"
                  checked={fromOptional}
                  onChange={(event) =>
                    relationData?.onRelationDataChange?.(id, {
                      fromOptional: event.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-zinc-600">To optional</span>
                <input
                  type="checkbox"
                  checked={toOptional}
                  onChange={(event) =>
                    relationData?.onRelationDataChange?.(id, {
                      toOptional: event.target.checked,
                    })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-zinc-600">Label mode</span>
                <select
                  className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px]"
                  value={labelMode}
                  onChange={(event) =>
                    relationData?.onRelationDataChange?.(id, {
                      labelMode: event.target.value === "custom" ? "custom" : "auto",
                    })
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <input
                className={cn(
                  "w-full rounded border px-2 py-1 text-[11px] outline-none",
                  labelMode === "custom"
                    ? "border-zinc-300 bg-white text-zinc-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400"
                )}
                value={draftCustomLabel}
                disabled={labelMode !== "custom"}
                placeholder="Custom label"
                onChange={(event) => setDraftCustomLabel(event.target.value)}
                onBlur={() => {
                  if (labelMode !== "custom") {
                    return;
                  }

                  if (draftCustomLabel !== label) {
                    relationData?.onRelationDataChange?.(id, {
                      label: draftCustomLabel,
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || labelMode !== "custom") {
                    return;
                  }

                  event.preventDefault();

                  if (draftCustomLabel !== label) {
                    relationData?.onRelationDataChange?.(id, {
                      label: draftCustomLabel,
                    });
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}
