"use client";

import { useEffect, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";

export type RemoteCursorPresence = {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

type CursorOverlayProps = {
  cursors: RemoteCursorPresence[];
};

const CURSOR_FADE_AFTER_MS = 8_000;
const CURSOR_REMOVE_AFTER_MS = 30_000;

const getCursorOpacity = (updatedAt: number, now: number) => {
  const inactiveMs = now - updatedAt;

  if (inactiveMs <= CURSOR_FADE_AFTER_MS) {
    return 1;
  }

  if (inactiveMs >= CURSOR_REMOVE_AFTER_MS) {
    return 0;
  }

  return Math.max(
    0,
    (CURSOR_REMOVE_AFTER_MS - inactiveMs) / (CURSOR_REMOVE_AFTER_MS - CURSOR_FADE_AFTER_MS)
  );
};

export function CursorOverlay({ cursors }: CursorOverlayProps) {
  const reactFlow = useReactFlow();
  const domNode = useStore((state) => state.domNode);
  const transformKey = useStore((state) => state.transform.join(":"));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (!domNode || cursors.length === 0) {
    return null;
  }

  const canvasBounds = domNode.getBoundingClientRect();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      data-transform={transformKey}
    >
      {cursors.map((cursor) => {
        const opacity = getCursorOpacity(cursor.updatedAt, now);

        if (opacity <= 0) {
          return null;
        }

        const screenPosition = reactFlow.flowToScreenPosition({
          x: cursor.x,
          y: cursor.y,
        });
        const left = screenPosition.x - canvasBounds.left;
        const top = screenPosition.y - canvasBounds.top;

        return (
          <div
            key={cursor.userId}
            className="absolute"
            style={{
              left,
              top,
              opacity,
              transform: "translate(-2px, -2px)",
            }}
          >
            <svg
              width="14"
              height="20"
              viewBox="0 0 14 20"
              aria-hidden="true"
              className="drop-shadow-[0_1px_3px_rgba(15,23,42,0.55)]"
            >
              <path
                d="M1 1 L1 17 L5.4 12.6 L9.4 19 L11.3 17.8 L7.2 11.4 L13 11.4 Z"
                fill={cursor.color}
                stroke="rgba(15,23,42,0.75)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="absolute left-4 top-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium text-zinc-900 shadow-sm"
              style={{
                backgroundColor: `${cursor.color}33`,
                borderColor: `${cursor.color}80`,
              }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

