"use client";

import { memo, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from "lucide-react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { getNodeMinSize } from "@/lib/editor/size";
import type { EditorNodeData } from "@/lib/diagram/mapper";
import { buildFieldHandleId } from "@/lib/diagram/relations";
import { cn } from "@/lib/utils";

type EditorFlowNode = Node<EditorNodeData>;

type ActiveFieldEdit =
  | {
      fieldId: string;
      key: "name" | "type";
      draft: string;
    }
  | null;

const dataTableMinSize = getNodeMinSize("dataTable");

export const DataTableNode = memo(function DataTableNode({
  id,
  data,
  selected,
}: NodeProps<EditorFlowNode>) {
  const [isEditingTableName, setIsEditingTableName] = useState(false);
  const [tableNameDraft, setTableNameDraft] = useState(data.dataModel?.tableName ?? data.text);
  const [activeFieldEdit, setActiveFieldEdit] = useState<ActiveFieldEdit>(null);
  const isLocked = data.isLocked;
  const isReadOnly = data.isReadOnly;
  const canMutate = !isReadOnly && !isLocked;
  const fields = data.dataModel?.fields ?? [];
  const highlightedFieldIds = useMemo(
    () => new Set(data.highlightedFieldIds ?? []),
    [data.highlightedFieldIds]
  );
  const isResizable = selected && !isLocked && !isReadOnly;

  const commitTableName = () => {
    const nextValue = tableNameDraft.trim();
    const fallback = data.dataModel?.tableName ?? "Table";
    data.onDataTableTableNameCommit?.(id, nextValue.length > 0 ? nextValue : fallback);
    setIsEditingTableName(false);
  };

  const cancelTableName = () => {
    setTableNameDraft(data.dataModel?.tableName ?? "Table");
    setIsEditingTableName(false);
  };

  const commitFieldCell = () => {
    if (!activeFieldEdit) {
      return;
    }

    const raw = activeFieldEdit.draft.trim();
    const currentField = fields.find((entry) => entry.id === activeFieldEdit.fieldId);

    if (!currentField) {
      setActiveFieldEdit(null);
      return;
    }

    if (activeFieldEdit.key === "name") {
      data.onDataTableFieldCommit?.(id, currentField.id, {
        name: raw.length > 0 ? raw : currentField.name,
      });
    } else {
      data.onDataTableFieldCommit?.(id, currentField.id, {
        type: raw.length > 0 ? raw : undefined,
      });
    }

    setActiveFieldEdit(null);
  };

  const cancelFieldCell = () => {
    setActiveFieldEdit(null);
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.7)] transition-all duration-200",
        selected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : "ring-0",
        !selected && data.relationHighlight === "strong"
          ? "ring-2 ring-cyan-500/90 ring-offset-1 ring-offset-white"
          : "",
        !selected && data.relationHighlight === "subtle"
          ? "ring-1 ring-cyan-500/55 ring-offset-1 ring-offset-white"
          : ""
      )}
      style={{
        width: data.size.width,
        height: data.size.height,
        borderColor: data.style.stroke,
        background: data.style.fill,
      }}
    >
      <NodeResizer
        isVisible={isResizable}
        minWidth={dataTableMinSize.minWidth}
        minHeight={dataTableMinSize.minHeight}
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
          isLocked ? "!bg-zinc-300" : "!bg-zinc-500"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !border-white transition-colors duration-150",
          isLocked ? "!bg-zinc-300" : "!bg-zinc-500"
        )}
      />

      <header className="border-b border-zinc-200 bg-zinc-50 px-3 py-2.5">
        {isEditingTableName ? (
          <input
            value={tableNameDraft}
            autoFocus
            className="nodrag nowheel w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onChange={(event) => setTableNameDraft(event.target.value)}
            onBlur={commitTableName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTableName();
              }

              if (event.key === "Escape") {
                event.preventDefault();
                cancelTableName();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={cn(
              "w-full truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold text-zinc-900",
              canMutate ? "cursor-text hover:bg-zinc-100" : "cursor-default"
            )}
            onClick={() => {
              if (!canMutate) {
                if (isLocked) {
                  data.onLockedInteraction();
                }
                return;
              }

              setTableNameDraft(data.dataModel?.tableName ?? "Table");
              setIsEditingTableName(true);
            }}
          >
            {data.dataModel?.tableName ?? "Table"}
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">
        <div className="divide-y divide-zinc-100">
          {fields.map((field, index) => {
            const isEditingName =
              activeFieldEdit?.fieldId === field.id && activeFieldEdit.key === "name";
            const isEditingType =
              activeFieldEdit?.fieldId === field.id && activeFieldEdit.key === "type";
            const isRowHighlighted = highlightedFieldIds.has(field.id);

            return (
              <div
                key={field.id}
                className={cn(
                  "relative grid min-h-8 grid-cols-[1fr_auto] items-center gap-2 px-3 py-2",
                  isRowHighlighted ? "bg-cyan-50/70" : "bg-white"
                )}
              >
                <Handle
                  id={buildFieldHandleId(field.id, "left")}
                  type="target"
                  position={Position.Left}
                  className="!h-2 !w-2 !border !border-white !bg-zinc-400"
                  style={{ top: "50%", transform: "translate(-50%, -50%)" }}
                />
                <Handle
                  id={buildFieldHandleId(field.id, "right")}
                  type="source"
                  position={Position.Right}
                  className="!h-2 !w-2 !border !border-white !bg-zinc-400"
                  style={{ top: "50%", transform: "translate(50%, -50%)" }}
                />

                <div className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-2">
                  {isEditingName ? (
                    <input
                      value={activeFieldEdit?.draft ?? ""}
                      autoFocus
                      className="nodrag nowheel w-full rounded border border-zinc-300 px-1.5 py-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onChange={(event) =>
                        setActiveFieldEdit((current) =>
                          current ? { ...current, draft: event.target.value } : current
                        )
                      }
                      onBlur={commitFieldCell}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitFieldCell();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelFieldCell();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-left text-xs font-medium",
                        canMutate ? "cursor-text hover:bg-zinc-100" : "cursor-default"
                      )}
                      onClick={() => {
                        if (!canMutate) {
                          return;
                        }

                        setActiveFieldEdit({
                          fieldId: field.id,
                          key: "name",
                          draft: field.name,
                        });
                      }}
                    >
                      {field.name}
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    {(field.isPK ?? false) ? (
                      <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        PK
                      </span>
                    ) : null}
                    {(field.isFK ?? false) ? (
                      <span className="rounded border border-blue-300 bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        FK
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={!canMutate}
                      onClick={() => data.onDataTableFieldToggle?.(id, field.id, "isPK")}
                      aria-label="Toggle primary key"
                    >
                      PK
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={!canMutate}
                      onClick={() => data.onDataTableFieldToggle?.(id, field.id, "isFK")}
                      aria-label="Toggle foreign key"
                    >
                      <Link2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-0.5">
                  {isEditingType ? (
                    <input
                      value={activeFieldEdit?.draft ?? ""}
                      autoFocus
                      className="nodrag nowheel w-20 rounded border border-zinc-300 px-1.5 py-0.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onChange={(event) =>
                        setActiveFieldEdit((current) =>
                          current ? { ...current, draft: event.target.value } : current
                        )
                      }
                      onBlur={commitFieldCell}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitFieldCell();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelFieldCell();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "w-20 truncate rounded px-1 py-0.5 text-left text-[11px] text-zinc-500",
                        canMutate ? "cursor-text hover:bg-zinc-100" : "cursor-default"
                      )}
                      onClick={() => {
                        if (!canMutate) {
                          return;
                        }

                        setActiveFieldEdit({
                          fieldId: field.id,
                          key: "type",
                          draft: field.type ?? "",
                        });
                      }}
                    >
                      {field.type ?? "\u2014"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canMutate || index === 0}
                    onClick={() => data.onDataTableFieldMove?.(id, field.id, "up")}
                    aria-label="Move field up"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canMutate || index === fields.length - 1}
                    onClick={() => data.onDataTableFieldMove?.(id, field.id, "down")}
                    aria-label="Move field down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canMutate || fields.length <= 1}
                    onClick={() => data.onDataTableFieldDelete?.(id, field.id)}
                    aria-label="Delete field"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-zinc-200 px-2 py-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canMutate}
          onClick={() => data.onDataTableFieldAdd?.(id)}
        >
          <Plus className="size-3.5" />
          Add field
        </button>
      </footer>
    </div>
  );
});
