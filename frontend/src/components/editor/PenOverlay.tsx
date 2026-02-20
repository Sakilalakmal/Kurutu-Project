"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewportPortal, useReactFlow, useViewport } from "@xyflow/react";
import type { DiagramStroke, EditorTool } from "@/lib/diagram/types";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

type PenOverlayProps = {
  strokes: DiagramStroke[];
  activeTool: EditorTool;
  readOnly?: boolean;
  brushColor: string;
  brushWidth: number;
  brushOpacity: number;
  eraserEnabled: boolean;
  onCreateStroke: (stroke: {
    color: string;
    width: number;
    opacity: number;
    points: Point[];
  }) => void;
  onDeleteStroke: (strokeId: string) => void;
};

const MIN_POINT_DISTANCE = 0.8;

const toPathData = (points: Point[]) => {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} l 0.001 0.001`;
  }

  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    commands.push(`L ${point.x} ${point.y}`);
  }

  return commands.join(" ");
};

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy))
  );
  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
};

const isPointNearStroke = (point: Point, stroke: DiagramStroke, zoom: number) => {
  if (stroke.points.length === 0) {
    return false;
  }

  const hitPadding = 6 / Math.max(zoom, 0.25);
  const tolerance = stroke.width / 2 + hitPadding;

  if (stroke.points.length === 1) {
    return Math.hypot(point.x - stroke.points[0].x, point.y - stroke.points[0].y) <= tolerance;
  }

  for (let index = 1; index < stroke.points.length; index += 1) {
    if (distanceToSegment(point, stroke.points[index - 1], stroke.points[index]) <= tolerance) {
      return true;
    }
  }

  return false;
};

export function PenOverlay({
  strokes,
  activeTool,
  readOnly = false,
  brushColor,
  brushWidth,
  brushOpacity,
  eraserEnabled,
  onCreateStroke,
  onDeleteStroke,
}: PenOverlayProps) {
  const flow = useReactFlow();
  const viewport = useViewport();
  const rafRef = useRef<number | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const draftPointsRef = useRef<Point[] | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[] | null>(null);

  const interactionEnabled = !readOnly && activeTool === "pen";

  const renderDraft = useCallback(() => {
    rafRef.current = null;
    const points = draftPointsRef.current;
    setDraftPoints(points ? [...points] : null);
  }, []);

  const scheduleDraftRender = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(renderDraft);
  }, [renderDraft]);

  const updateDraftWithPoint = useCallback(
    (point: Point) => {
      const points = draftPointsRef.current;

      if (!points || points.length === 0) {
        return;
      }

      const lastPoint = points[points.length - 1];

      if (Math.hypot(lastPoint.x - point.x, lastPoint.y - point.y) < MIN_POINT_DISTANCE) {
        return;
      }

      points.push(point);
      scheduleDraftRender();
    },
    [scheduleDraftRender]
  );

  const endDrawing = useCallback(() => {
    drawingPointerIdRef.current = null;

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const points = draftPointsRef.current ?? [];
    draftPointsRef.current = null;
    setDraftPoints(null);

    if (points.length === 0) {
      return;
    }

    onCreateStroke({
      color: brushColor,
      width: brushWidth,
      opacity: brushOpacity,
      points,
    });
  }, [brushColor, brushOpacity, brushWidth, onCreateStroke]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  return (
    <>
      <ViewportPortal>
        <svg
          className="pointer-events-none absolute inset-0 z-40 overflow-visible"
          aria-hidden="true"
        >
          {strokes.map((stroke) => (
            <path
              key={stroke.id}
              d={toPathData(stroke.points)}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={stroke.opacity ?? 1}
            />
          ))}
          {draftPoints && draftPoints.length > 0 ? (
            <path
              d={toPathData(draftPoints)}
              fill="none"
              stroke={brushColor}
              strokeWidth={brushWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={brushOpacity}
            />
          ) : null}
        </svg>
      </ViewportPortal>
      <div
        className={cn(
          "absolute inset-0 z-40 touch-none",
          interactionEnabled ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{
          cursor: eraserEnabled ? "not-allowed" : "crosshair",
        }}
        onPointerDown={(event) => {
          if (!interactionEnabled) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const flowPoint = flow.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          if (eraserEnabled) {
            const matchedStroke = [...strokes]
              .reverse()
              .find((stroke) => isPointNearStroke(flowPoint, stroke, viewport.zoom));

            if (matchedStroke) {
              onDeleteStroke(matchedStroke.id);
            }

            return;
          }

          drawingPointerIdRef.current = event.pointerId;
          draftPointsRef.current = [flowPoint];
          setDraftPoints([flowPoint]);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!interactionEnabled || drawingPointerIdRef.current !== event.pointerId) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          updateDraftWithPoint(
            flow.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            })
          );
        }}
        onPointerUp={(event) => {
          if (!interactionEnabled || drawingPointerIdRef.current !== event.pointerId) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.releasePointerCapture(event.pointerId);
          endDrawing();
        }}
        onPointerCancel={(event) => {
          if (!interactionEnabled || drawingPointerIdRef.current !== event.pointerId) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          endDrawing();
        }}
      />
    </>
  );
}
