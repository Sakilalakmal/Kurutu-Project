import type { Node } from "@xyflow/react";
import { createDataTableFieldId } from "@/lib/diagram/defaults";
import type {
  DataTableField,
  DataTableNodeData,
  RelationEdgeData,
  RelationType,
} from "@/lib/diagram/types";
import type { EditorEdge, EditorNodeData } from "@/lib/diagram/mapper";

export const FIELD_HANDLE_PREFIX = "field:";
export const FIELD_HANDLE_LEFT_SUFFIX = ":left";
export const FIELD_HANDLE_RIGHT_SUFFIX = ":right";

export const buildFieldHandleId = (fieldId: string, side: "left" | "right") =>
  `${FIELD_HANDLE_PREFIX}${fieldId}:${side}`;

export const parseFieldHandleId = (handleId?: string | null): string | undefined => {
  if (!handleId || !handleId.startsWith(FIELD_HANDLE_PREFIX)) {
    return undefined;
  }

  const segments = handleId.split(":");

  if (segments.length !== 3 || segments[0] !== "field") {
    return undefined;
  }

  if (segments[2] !== "left" && segments[2] !== "right") {
    return undefined;
  }

  return segments[1] || undefined;
};

const cloneField = (field: DataTableField): DataTableField => ({
  id: field.id,
  name: field.name,
  type: field.type,
  isPK: field.isPK,
  isFK: field.isFK,
});

export const cloneRelationEdgeData = (input: RelationEdgeData): RelationEdgeData => ({
  kind: "relation",
  fromTableId: input.fromTableId,
  toTableId: input.toTableId,
  fromFieldId: input.fromFieldId,
  toFieldId: input.toFieldId,
  relationType: input.relationType,
  fromOptional: input.fromOptional,
  toOptional: input.toOptional,
  labelMode: input.labelMode,
  label: input.label,
});

export const sanitizeDataTableNodeData = (input: unknown): DataTableNodeData | undefined => {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<DataTableNodeData>;
  const tableName = candidate.tableName?.trim();
  const fields = Array.isArray(candidate.fields) ? candidate.fields : [];

  const sanitizedFields = fields
    .filter((field): field is DataTableField => Boolean(field && typeof field === "object"))
    .map((field) => {
      const name = (field.name ?? "").trim();

      return {
        id: field.id?.trim() || createDataTableFieldId(),
        name: name.length > 0 ? name : "field",
        type: field.type?.trim() || undefined,
        isPK: field.isPK,
        isFK: field.isFK,
      } satisfies DataTableField;
    });

  if (!tableName || sanitizedFields.length === 0) {
    return undefined;
  }

  return {
    tableName,
    fields: sanitizedFields.map(cloneField),
  };
};

export const sanitizeRelationEdgeData = (input: unknown): RelationEdgeData | undefined => {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const candidate = input as Partial<RelationEdgeData>;

  if (candidate.kind !== "relation") {
    return undefined;
  }

  if (!candidate.fromTableId || !candidate.toTableId) {
    return undefined;
  }

  const relationType: RelationType =
    candidate.relationType === "one-to-one" ||
    candidate.relationType === "many-to-many" ||
    candidate.relationType === "one-to-many"
      ? candidate.relationType
      : "one-to-many";

  const labelMode = candidate.labelMode === "custom" ? "custom" : "auto";

  return {
    kind: "relation",
    fromTableId: candidate.fromTableId,
    toTableId: candidate.toTableId,
    fromFieldId: candidate.fromFieldId,
    toFieldId: candidate.toFieldId,
    relationType,
    fromOptional: candidate.fromOptional,
    toOptional: candidate.toOptional,
    labelMode,
    label: candidate.label,
  };
};

const findFieldName = (node: Node<EditorNodeData> | undefined, fieldId?: string) => {
  if (!node?.data.dataModel || !fieldId) {
    return undefined;
  }

  return node.data.dataModel.fields.find((field) => field.id === fieldId)?.name;
};

export const buildRelationAutoLabel = (
  relationData: RelationEdgeData,
  nodesById: Map<string, Node<EditorNodeData>>
) => {
  if (!relationData.fromFieldId || !relationData.toFieldId) {
    return "";
  }

  const fromNode = nodesById.get(relationData.fromTableId);
  const toNode = nodesById.get(relationData.toTableId);

  if (!fromNode?.data.dataModel || !toNode?.data.dataModel) {
    return "";
  }

  const fromFieldName = findFieldName(fromNode, relationData.fromFieldId);
  const toFieldName = findFieldName(toNode, relationData.toFieldId);

  if (!fromFieldName || !toFieldName) {
    return "";
  }

  return `${fromNode.data.dataModel.tableName}.${fromFieldName} \u2192 ${toNode.data.dataModel.tableName}.${toFieldName}`;
};

export const recomputeAutoRelationLabels = (
  edges: EditorEdge[],
  nodes: Node<EditorNodeData>[]
): EditorEdge[] => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let changed = false;

  const nextEdges = edges.map((edge) => {
    const relationData = sanitizeRelationEdgeData(edge.data);

    if (!relationData || relationData.labelMode !== "auto") {
      return edge;
    }

    const nextLabel = buildRelationAutoLabel(relationData, nodesById);

    if ((relationData.label ?? "") === nextLabel) {
      return edge;
    }

    changed = true;

    return {
      ...edge,
      data: {
        ...relationData,
        label: nextLabel,
      },
    } satisfies EditorEdge;
  });

  return changed ? nextEdges : edges;
};

export const setRelationManySideFkIfUnset = (
  nodes: Node<EditorNodeData>[],
  relationData: RelationEdgeData
) => {
  if (
    relationData.relationType !== "one-to-many" ||
    !relationData.toFieldId ||
    !relationData.toTableId
  ) {
    return nodes;
  }

  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.id !== relationData.toTableId || !node.data.dataModel) {
      return node;
    }

    const nextFields = node.data.dataModel.fields.map((field) => {
      if (field.id !== relationData.toFieldId || field.isFK !== undefined) {
        return field;
      }

      changed = true;
      return {
        ...field,
        isFK: true,
      };
    });

    if (!changed) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        dataModel: {
          ...node.data.dataModel,
          fields: nextFields,
        },
      },
    };
  });

  return changed ? nextNodes : nodes;
};

export const resolveRelationSideMaximum = (
  relationType: RelationType,
  side: "from" | "to"
): "one" | "many" => {
  if (relationType === "one-to-one") {
    return "one";
  }

  if (relationType === "many-to-many") {
    return "many";
  }

  return side === "from" ? "one" : "many";
};
