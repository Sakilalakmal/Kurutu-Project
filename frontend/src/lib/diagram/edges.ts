import { ConnectionLineType, MarkerType, type Edge } from "@xyflow/react";
import type { DiagramEdgeType } from "@/lib/diagram/types";

export const EDGE_STYLE_OPTIONS: DiagramEdgeType[] = [
  "smoothstep",
  "straight",
  "step",
  "bezier",
];

export const EDGE_STYLE_LABELS: Record<DiagramEdgeType, string> = {
  smoothstep: "Smooth",
  straight: "Straight",
  step: "Step",
  bezier: "Bezier",
};

export const toRuntimeEdgeType = (style: DiagramEdgeType): NonNullable<Edge["type"]> =>
  style === "bezier" ? "default" : style;

export const toStoredEdgeStyle = (value: string | undefined): DiagramEdgeType => {
  if (value === "straight" || value === "step" || value === "smoothstep") {
    return value;
  }

  if (value === "default" || value === "simplebezier" || value === "bezier") {
    return "bezier";
  }

  return "smoothstep";
};

export const toConnectionLineType = (style: DiagramEdgeType): ConnectionLineType => {
  if (style === "straight") {
    return ConnectionLineType.Straight;
  }

  if (style === "step") {
    return ConnectionLineType.Step;
  }

  if (style === "bezier") {
    return ConnectionLineType.Bezier;
  }

  return ConnectionLineType.SmoothStep;
};

export const applyEdgeStyle = <TEdge extends Edge>(
  edges: TEdge[],
  style: DiagramEdgeType,
  animated: boolean
): TEdge[] =>
  edges.map((edge) => ({
    ...edge,
    type: toRuntimeEdgeType(style),
    animated,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
