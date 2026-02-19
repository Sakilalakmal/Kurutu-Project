"use client";

import { useMemo, useState } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import { cn } from "@/lib/utils";

type ShapeKind = "rectangle" | "ellipse" | "sticky";

const shapeClassMap: Record<ShapeKind, string> = {
  rectangle: "rounded-xl",
  ellipse: "rounded-full",
  sticky: "rounded-2xl shadow-[0_10px_28px_-18px_rgba(120,113,108,0.7)]",
};

type EditorFlowNode = Node<EditorNodeData>;

function EditableShapeNode({
  id,
  data,
  selected,
  kind,
}: NodeProps<EditorFlowNode> & {
  kind: ShapeKind;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(data.text);

  const shouldRenderStickyAccent = kind === "sticky";
  const textColorClass = useMemo(
    () => (kind === "sticky" ? "font-medium text-[13px]" : "text-sm"),
    [kind]
  );
  const isLocked = data.isLocked;
  const isReadOnly = data.isReadOnly;

  const commitText = () => {
    const nextText = draftText.trim();
    data.onTextChange(id, nextText.length > 0 ? nextText : data.text);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center border bg-white px-3 py-2 text-center transition-all duration-200 ease-out",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_36px_-28px_rgba(17,24,39,0.75)]",
        selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : "ring-0",
        shapeClassMap[kind]
      )}
      style={{
        width: data.size.width,
        height: data.size.height,
        background: data.style.fill,
        borderColor: data.style.stroke,
        color: data.style.textColor,
      }}
      onDoubleClick={() => {
        if (isReadOnly) {
          return;
        }

        if (isLocked) {
          data.onLockedInteraction();
          return;
        }

        setDraftText(data.text);
        setIsEditing(true);
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-white transition-colors duration-150",
          isLocked ? "!bg-zinc-300" : "!bg-zinc-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-white transition-colors duration-150",
          isLocked ? "!bg-zinc-300" : "!bg-zinc-400"
        )}
      />
      {shouldRenderStickyAccent ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-black/10"
        />
      ) : null}
      {isEditing ? (
        <input
          className="nodrag nowheel w-full rounded-md border border-black/15 bg-white/70 px-2 py-1 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          value={draftText}
          autoFocus
          aria-label="Edit node text"
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setDraftText(data.text);
              setIsEditing(false);
            }
          }}
        />
      ) : (
        <p className={cn("pointer-events-none line-clamp-4 whitespace-pre-wrap", textColorClass)}>
          {data.text}
        </p>
      )}
    </div>
  );
}

function RectangleNode(props: NodeProps<EditorFlowNode>) {
  return <EditableShapeNode {...props} kind="rectangle" />;
}

function EllipseNode(props: NodeProps<EditorFlowNode>) {
  return <EditableShapeNode {...props} kind="ellipse" />;
}

function StickyNode(props: NodeProps<EditorFlowNode>) {
  return <EditableShapeNode {...props} kind="sticky" />;
}

export const editorNodeTypes: NodeTypes = {
  rectangle: RectangleNode,
  ellipse: EllipseNode,
  sticky: StickyNode,
};
