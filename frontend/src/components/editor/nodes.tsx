"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import { DataTableNode } from "@/components/editor/nodes/DataTableNode";
import { TextNode } from "@/components/editor/nodes/TextNode";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import { cn } from "@/lib/utils";

type ShapeKind =
  | "rectangle"
  | "ellipse"
  | "sticky"
  | "wireframeButton"
  | "wireframeInput"
  | "wireframeCard"
  | "wireframeAvatar"
  | "wireframeNavbar"
  | "wireframeSidebar"
  | "wireframeModal";

const shapeClassMap: Record<ShapeKind, string> = {
  rectangle: "rounded-xl",
  ellipse: "rounded-full",
  sticky: "rounded-2xl shadow-[0_10px_28px_-18px_rgba(120,113,108,0.7)]",
  wireframeButton: "rounded-lg",
  wireframeInput: "rounded-lg",
  wireframeCard: "rounded-xl",
  wireframeAvatar: "rounded-full",
  wireframeNavbar: "rounded-xl",
  wireframeSidebar: "rounded-xl",
  wireframeModal: "rounded-2xl shadow-[0_18px_40px_-28px_rgba(71,85,105,0.7)]",
};

type EditorFlowNode = Node<EditorNodeData>;

function EditableNodeFrame({
  id,
  data,
  selected,
  kind,
  children,
}: NodeProps<EditorFlowNode> & {
  kind: ShapeKind;
  children: ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(data.text);
  const shouldRenderStickyAccent = kind === "sticky";
  const isLocked = data.isLocked;
  const isReadOnly = data.isReadOnly;

  const textColorClass = useMemo(
    () => (kind === "sticky" ? "font-medium text-[13px]" : "text-sm"),
    [kind]
  );

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
        !selected && data.relationHighlight === "strong"
          ? "ring-2 ring-cyan-500/90 ring-offset-1 ring-offset-white"
          : "",
        !selected && data.relationHighlight === "subtle"
          ? "ring-1 ring-cyan-500/55 ring-offset-1 ring-offset-white"
          : "",
        shapeClassMap[kind]
      )}
      style={{
        width: data.size.width,
        height: data.size.height,
        background: data.style.fill,
        borderColor: data.style.stroke,
        borderWidth: data.style.strokeWidth ?? 1,
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
        <div className={cn("pointer-events-none w-full", textColorClass)}>{children}</div>
      )}
    </div>
  );
}

function RectangleNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="rectangle">
      <p className="line-clamp-4 whitespace-pre-wrap">{props.data.text}</p>
    </EditableNodeFrame>
  );
}

function EllipseNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="ellipse">
      <p className="line-clamp-4 whitespace-pre-wrap">{props.data.text}</p>
    </EditableNodeFrame>
  );
}

function StickyNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="sticky">
      <p className="line-clamp-4 whitespace-pre-wrap">{props.data.text}</p>
    </EditableNodeFrame>
  );
}

function WireframeButtonNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeButton">
      <p className="font-medium tracking-tight">{props.data.text}</p>
    </EditableNodeFrame>
  );
}

function WireframeInputNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeInput">
      <div className="flex w-full items-center justify-between gap-2 rounded-md border border-black/10 bg-white/70 px-2.5 py-2 text-left">
        <span className="truncate text-xs text-zinc-500">{props.data.text}</span>
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-zinc-300" />
      </div>
    </EditableNodeFrame>
  );
}

function WireframeCardNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeCard">
      <div className="w-full space-y-3 text-left">
        <div className="h-6 w-2/3 rounded bg-zinc-100" />
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-zinc-100" />
          <div className="h-2 w-4/5 rounded bg-zinc-100" />
        </div>
        <p className="truncate text-xs font-medium text-zinc-600">{props.data.text}</p>
      </div>
    </EditableNodeFrame>
  );
}

function WireframeAvatarNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeAvatar">
      <p className="text-xs font-semibold tracking-wide uppercase">{props.data.text}</p>
    </EditableNodeFrame>
  );
}

function WireframeNavbarNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeNavbar">
      <div className="flex w-full items-center justify-between gap-2 text-left">
        <div className="h-5 w-20 rounded bg-zinc-200/80" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 rounded bg-zinc-200/80" />
          <div className="h-3 w-10 rounded bg-zinc-200/80" />
          <div className="h-3 w-10 rounded bg-zinc-200/80" />
        </div>
      </div>
    </EditableNodeFrame>
  );
}

function WireframeSidebarNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeSidebar">
      <div className="w-full space-y-3 text-left">
        <div className="h-5 w-3/4 rounded bg-zinc-200/80" />
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-11/12 rounded bg-zinc-100" />
        <div className="h-3 w-10/12 rounded bg-zinc-100" />
        <div className="h-3 w-9/12 rounded bg-zinc-100" />
      </div>
    </EditableNodeFrame>
  );
}

function WireframeModalNode(props: NodeProps<EditorFlowNode>) {
  return (
    <EditableNodeFrame {...props} kind="wireframeModal">
      <div className="w-full space-y-3 text-left">
        <div className="h-4 w-2/3 rounded bg-zinc-200/80" />
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-zinc-100" />
          <div className="h-2 w-5/6 rounded bg-zinc-100" />
          <div className="h-2 w-4/6 rounded bg-zinc-100" />
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-6 w-16 rounded bg-zinc-200/80" />
          <div className="h-6 w-16 rounded bg-zinc-300/80" />
        </div>
      </div>
    </EditableNodeFrame>
  );
}

export const editorNodeTypes: NodeTypes = {
  rectangle: RectangleNode,
  ellipse: EllipseNode,
  sticky: StickyNode,
  textNode: TextNode,
  dataTable: DataTableNode,
  wireframeButton: WireframeButtonNode,
  wireframeInput: WireframeInputNode,
  wireframeCard: WireframeCardNode,
  wireframeAvatar: WireframeAvatarNode,
  wireframeNavbar: WireframeNavbarNode,
  wireframeSidebar: WireframeSidebarNode,
  wireframeModal: WireframeModalNode,
};
