"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { getNodeMinSize } from "@/lib/editor/size";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import { cn } from "@/lib/utils";

type EditorFlowNode = Node<EditorNodeData>;

const sanitizeText = (value: string) => value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");

const fontSizeClassMap: Record<number, string> = {
  14: "text-sm",
  16: "text-base",
  20: "text-xl",
};

const textNodeMinSize = getNodeMinSize("textNode");

export const TextNode = memo(function TextNode({ id, data, selected }: NodeProps<EditorFlowNode>) {
  const [isEditing, setIsEditing] = useState(() => Boolean(data.autoEdit));
  const [draftText, setDraftText] = useState(data.text);
  const editableRef = useRef<HTMLDivElement | null>(null);
  const isResizable = selected && !data.isLocked && !data.isReadOnly;

  const textClassName = useMemo(() => {
    const configuredSize = Math.round(data.style.fontSize ?? 16);
    return fontSizeClassMap[configuredSize] ?? "text-base";
  }, [data.style.fontSize]);

  useEffect(() => {
    if (!isEditing || !editableRef.current) {
      return;
    }

    editableRef.current.focus();
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editableRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing]);

  const commitText = () => {
    const nextText = sanitizeText(draftText).trim();
    data.onTextChange(id, nextText.length > 0 ? nextText : data.text);
    setIsEditing(false);
  };

  const cancelText = () => {
    setDraftText(data.text);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "relative min-w-[120px] overflow-hidden rounded-md border border-transparent bg-transparent px-2 py-1",
        selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : "ring-0",
        !selected && data.relationHighlight === "strong"
          ? "ring-2 ring-cyan-500/90 ring-offset-1 ring-offset-white"
          : "",
        !selected && data.relationHighlight === "subtle"
          ? "ring-1 ring-cyan-500/55 ring-offset-1 ring-offset-white"
          : ""
      )}
      style={{
        color: data.style.textColor,
        width: data.size.width,
        height: data.size.height,
      }}
      onDoubleClick={() => {
        if (data.isReadOnly) {
          return;
        }

        if (data.isLocked) {
          data.onLockedInteraction();
          return;
        }

        setDraftText(data.text);
        setIsEditing(true);
      }}
    >
      <NodeResizer
        isVisible={isResizable}
        minWidth={textNodeMinSize.minWidth}
        minHeight={textNodeMinSize.minHeight}
        handleClassName="!h-2.5 !w-2.5 !rounded-[4px] !border !border-white !bg-blue-500 shadow-sm"
        lineClassName="!border-blue-400/70"
        onResizeStart={(_, params) => data.onResizeStart?.(id, params)}
        onResize={(_, params) => data.onResize?.(id, params)}
        onResizeEnd={(_, params) => data.onResizeEnd?.(id, params)}
      />
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-white transition-colors duration-150",
          data.isLocked ? "!bg-zinc-300" : "!bg-zinc-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-white transition-colors duration-150",
          data.isLocked ? "!bg-zinc-300" : "!bg-zinc-400"
        )}
      />
      {isEditing ? (
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "nodrag nowheel min-w-[96px] whitespace-pre-wrap rounded-md border border-black/15 bg-white/80 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            textClassName
          )}
          aria-label="Edit text node"
          onInput={(event) => {
            const text = sanitizeText(event.currentTarget.textContent ?? "");
            setDraftText(text);
            if ((event.currentTarget.textContent ?? "") !== text) {
              event.currentTarget.textContent = text;
            }
          }}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              cancelText();
            }
          }}
        >
          {draftText}
        </div>
      ) : (
        <p
          className={cn(
            "pointer-events-none min-w-[96px] whitespace-pre-wrap break-words",
            textClassName
          )}
        >
          {data.text}
        </p>
      )}
    </div>
  );
});
