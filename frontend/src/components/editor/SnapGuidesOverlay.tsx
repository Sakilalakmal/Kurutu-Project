"use client";

import { useMemo } from "react";
import { useViewport } from "@xyflow/react";
import type { SnapGuides } from "@/lib/diagram/smartSnap";

type SnapGuidesOverlayProps = {
  guides?: SnapGuides | null;
};

export function SnapGuidesOverlay({ guides }: SnapGuidesOverlayProps) {
  const viewport = useViewport();

  const screenGuides = useMemo(() => {
    if (!guides || (guides.x === undefined && guides.y === undefined)) {
      return null;
    }

    return {
      x: guides.x === undefined ? undefined : guides.x * viewport.zoom + viewport.x,
      y: guides.y === undefined ? undefined : guides.y * viewport.zoom + viewport.y,
    };
  }, [guides, viewport.x, viewport.y, viewport.zoom]);

  if (!screenGuides) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {screenGuides.x !== undefined ? (
        <div
          className="absolute top-0 bottom-0 w-px bg-[rgba(59,91,124,0.52)] shadow-[0_0_0_1px_rgba(255,255,255,0.24)]"
          style={{ left: `${screenGuides.x}px` }}
        />
      ) : null}

      {screenGuides.y !== undefined ? (
        <div
          className="absolute left-0 right-0 h-px bg-[rgba(59,91,124,0.52)] shadow-[0_0_0_1px_rgba(255,255,255,0.24)]"
          style={{ top: `${screenGuides.y}px` }}
        />
      ) : null}

      {screenGuides.x !== undefined && screenGuides.y !== undefined ? (
        <span
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(59,91,124,0.62)] bg-[rgba(255,255,255,0.82)]"
          style={{
            left: `${screenGuides.x}px`,
            top: `${screenGuides.y}px`,
          }}
        />
      ) : null}
    </div>
  );
}
