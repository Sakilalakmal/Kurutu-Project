import { migrateDiagramData } from "@/lib/diagram/migrate";
import type {
  DataTableField,
  RelationLabelMode,
  RelationType,
} from "@/lib/diagram/types";
import type { WorkspaceMemberRole } from "@/lib/workspace/types";
import type { LogActivityInput } from "@/lib/activity/logActivity";

type DataTableInfo = {
  id: string;
  pageId: string;
  tableName: string;
  fieldsById: Map<string, DataTableField>;
};

type RelationInfo = {
  id: string;
  pageId: string;
  fromTableId: string;
  toTableId: string;
  fromFieldId?: string;
  toFieldId?: string;
  relationType: RelationType;
  fromOptional: boolean;
  toOptional: boolean;
  labelMode: RelationLabelMode;
  label: string;
};

type DiagramActivitySnapshot = {
  tablesById: Map<string, DataTableInfo>;
  relationsById: Map<string, RelationInfo>;
};

export type DiffDiagramActivityInput = {
  workspaceId: string;
  diagramId: string;
  actorUserId: string;
  actorRole: WorkspaceMemberRole;
  previousData: unknown;
  nextData: unknown;
};

type ActivityDraft = Omit<LogActivityInput, "tx">;

const sortedIds = (ids: Iterable<string>) => [...ids].sort((left, right) => left.localeCompare(right));

const mapDiagramSnapshot = (input: unknown): DiagramActivitySnapshot => {
  const document = migrateDiagramData(input);
  const tablesById = new Map<string, DataTableInfo>();
  const relationsById = new Map<string, RelationInfo>();

  for (const page of document.pages) {
    for (const node of page.nodes) {
      if (node.type !== "dataTable" || !node.data) {
        continue;
      }

      tablesById.set(node.id, {
        id: node.id,
        pageId: page.id,
        tableName: node.data.tableName,
        fieldsById: new Map(node.data.fields.map((field) => [field.id, field])),
      });
    }

    for (const edge of page.edges) {
      if (!edge.data || edge.data.kind !== "relation") {
        continue;
      }

      relationsById.set(edge.id, {
        id: edge.id,
        pageId: page.id,
        fromTableId: edge.data.fromTableId,
        toTableId: edge.data.toTableId,
        fromFieldId: edge.data.fromFieldId,
        toFieldId: edge.data.toFieldId,
        relationType: edge.data.relationType,
        fromOptional: edge.data.fromOptional ?? false,
        toOptional: edge.data.toOptional ?? false,
        labelMode: edge.data.labelMode,
        label: edge.data.label ?? "",
      });
    }
  }

  return {
    tablesById,
    relationsById,
  };
};

const resolveTableName = (snapshot: DiagramActivitySnapshot, tableId: string) =>
  snapshot.tablesById.get(tableId)?.tableName ?? tableId;

const resolveFieldName = (
  snapshot: DiagramActivitySnapshot,
  tableId: string,
  fieldId?: string
) => {
  if (!fieldId) {
    return undefined;
  }

  return snapshot.tablesById.get(tableId)?.fieldsById.get(fieldId)?.name ?? fieldId;
};

const resolveEndpoint = (
  snapshot: DiagramActivitySnapshot,
  tableId: string,
  fieldId?: string
) => {
  const tableName = resolveTableName(snapshot, tableId);
  const fieldName = resolveFieldName(snapshot, tableId, fieldId) ?? "?";

  return `${tableName}.${fieldName}`;
};

const buildFieldUpdateSummary = (
  previousField: DataTableField,
  nextField: DataTableField,
  tableName: string
) => {
  if (previousField.name !== nextField.name) {
    return `renamed field "${previousField.name}" to "${nextField.name}" in table "${tableName}"`;
  }

  return `updated field "${nextField.name}" in table "${tableName}"`;
};

const relationWithoutLabelEquals = (left: RelationInfo, right: RelationInfo) =>
  left.fromTableId === right.fromTableId &&
  left.toTableId === right.toTableId &&
  left.fromFieldId === right.fromFieldId &&
  left.toFieldId === right.toFieldId &&
  left.relationType === right.relationType &&
  left.fromOptional === right.fromOptional &&
  left.toOptional === right.toOptional &&
  left.labelMode === right.labelMode;

export const diffDiagramActivity = ({
  workspaceId,
  diagramId,
  actorUserId,
  actorRole,
  previousData,
  nextData,
}: DiffDiagramActivityInput): ActivityDraft[] => {
  const previousSnapshot = mapDiagramSnapshot(previousData);
  const nextSnapshot = mapDiagramSnapshot(nextData);
  const activities: ActivityDraft[] = [];

  for (const tableId of sortedIds(nextSnapshot.tablesById.keys())) {
    if (previousSnapshot.tablesById.has(tableId)) {
      continue;
    }

    const nextTable = nextSnapshot.tablesById.get(tableId);

    if (!nextTable) {
      continue;
    }

    activities.push({
      workspaceId,
      diagramId,
      actorUserId,
      actionType: "NODE_CREATE",
      entityType: "NODE",
      entityId: tableId,
      summary: `created table "${nextTable.tableName}"`,
      metadata: {
        actorRole,
        pageId: nextTable.pageId,
        tableName: nextTable.tableName,
      },
    });
  }

  for (const tableId of sortedIds(previousSnapshot.tablesById.keys())) {
    const previousTable = previousSnapshot.tablesById.get(tableId);
    const nextTable = nextSnapshot.tablesById.get(tableId);

    if (!previousTable) {
      continue;
    }

    if (!nextTable) {
      activities.push({
        workspaceId,
        diagramId,
        actorUserId,
        actionType: "NODE_DELETE",
        entityType: "NODE",
        entityId: tableId,
        summary: `deleted table "${previousTable.tableName}"`,
        metadata: {
          actorRole,
          pageId: previousTable.pageId,
          tableName: previousTable.tableName,
        },
      });
      continue;
    }

    if (previousTable.tableName !== nextTable.tableName) {
      activities.push({
        workspaceId,
        diagramId,
        actorUserId,
        actionType: "NODE_UPDATE",
        entityType: "NODE",
        entityId: tableId,
        summary: `renamed table "${previousTable.tableName}" to "${nextTable.tableName}"`,
        metadata: {
          actorRole,
          pageId: nextTable.pageId,
          previousTableName: previousTable.tableName,
          nextTableName: nextTable.tableName,
        },
      });
    }

    for (const fieldId of sortedIds(nextTable.fieldsById.keys())) {
      if (previousTable.fieldsById.has(fieldId)) {
        continue;
      }

      const nextField = nextTable.fieldsById.get(fieldId);

      if (!nextField) {
        continue;
      }

      activities.push({
        workspaceId,
        diagramId,
        actorUserId,
        actionType: "FIELD_ADD",
        entityType: "FIELD",
        entityId: fieldId,
        summary: `added field "${nextField.name}" to table "${nextTable.tableName}"`,
        metadata: {
          actorRole,
          pageId: nextTable.pageId,
          tableId,
          tableName: nextTable.tableName,
          fieldName: nextField.name,
          fieldType: nextField.type ?? null,
          isPK: Boolean(nextField.isPK),
          isFK: Boolean(nextField.isFK),
        },
      });
    }

    for (const fieldId of sortedIds(previousTable.fieldsById.keys())) {
      const previousField = previousTable.fieldsById.get(fieldId);
      const nextField = nextTable.fieldsById.get(fieldId);

      if (!previousField) {
        continue;
      }

      if (!nextField) {
        activities.push({
          workspaceId,
          diagramId,
          actorUserId,
          actionType: "FIELD_DELETE",
          entityType: "FIELD",
          entityId: fieldId,
          summary: `deleted field "${previousField.name}" from table "${previousTable.tableName}"`,
          metadata: {
            actorRole,
            pageId: previousTable.pageId,
            tableId,
            tableName: previousTable.tableName,
            fieldName: previousField.name,
            fieldType: previousField.type ?? null,
          },
        });
        continue;
      }

      const fieldChanged =
        previousField.name !== nextField.name ||
        (previousField.type ?? null) !== (nextField.type ?? null) ||
        Boolean(previousField.isPK) !== Boolean(nextField.isPK) ||
        Boolean(previousField.isFK) !== Boolean(nextField.isFK);

      if (!fieldChanged) {
        continue;
      }

      activities.push({
        workspaceId,
        diagramId,
        actorUserId,
        actionType: "FIELD_UPDATE",
        entityType: "FIELD",
        entityId: fieldId,
        summary: buildFieldUpdateSummary(previousField, nextField, nextTable.tableName),
        metadata: {
          actorRole,
          pageId: nextTable.pageId,
          tableId,
          tableName: nextTable.tableName,
          previous: {
            name: previousField.name,
            type: previousField.type ?? null,
            isPK: Boolean(previousField.isPK),
            isFK: Boolean(previousField.isFK),
          },
          next: {
            name: nextField.name,
            type: nextField.type ?? null,
            isPK: Boolean(nextField.isPK),
            isFK: Boolean(nextField.isFK),
          },
        },
      });
    }
  }

  for (const edgeId of sortedIds(nextSnapshot.relationsById.keys())) {
    if (previousSnapshot.relationsById.has(edgeId)) {
      continue;
    }

    const nextRelation = nextSnapshot.relationsById.get(edgeId);

    if (!nextRelation) {
      continue;
    }

    const fromEndpoint = resolveEndpoint(
      nextSnapshot,
      nextRelation.fromTableId,
      nextRelation.fromFieldId
    );
    const toEndpoint = resolveEndpoint(
      nextSnapshot,
      nextRelation.toTableId,
      nextRelation.toFieldId
    );

    activities.push({
      workspaceId,
      diagramId,
      actorUserId,
      actionType: "EDGE_CREATE",
      entityType: "EDGE",
      entityId: edgeId,
      summary: `created relationship ${fromEndpoint} -> ${toEndpoint}`,
      metadata: {
        actorRole,
        pageId: nextRelation.pageId,
        fromEndpoint,
        toEndpoint,
        relationType: nextRelation.relationType,
        fromOptional: nextRelation.fromOptional,
        toOptional: nextRelation.toOptional,
        labelMode: nextRelation.labelMode,
        label: nextRelation.label,
      },
    });
  }

  for (const edgeId of sortedIds(previousSnapshot.relationsById.keys())) {
    const previousRelation = previousSnapshot.relationsById.get(edgeId);
    const nextRelation = nextSnapshot.relationsById.get(edgeId);

    if (!previousRelation) {
      continue;
    }

    if (!nextRelation) {
      const fromEndpoint = resolveEndpoint(
        previousSnapshot,
        previousRelation.fromTableId,
        previousRelation.fromFieldId
      );
      const toEndpoint = resolveEndpoint(
        previousSnapshot,
        previousRelation.toTableId,
        previousRelation.toFieldId
      );

      activities.push({
        workspaceId,
        diagramId,
        actorUserId,
        actionType: "EDGE_DELETE",
        entityType: "EDGE",
        entityId: edgeId,
        summary: `deleted relationship ${fromEndpoint} -> ${toEndpoint}`,
        metadata: {
          actorRole,
          pageId: previousRelation.pageId,
          fromEndpoint,
          toEndpoint,
        },
      });
      continue;
    }

    const onlyLabelChanged =
      relationWithoutLabelEquals(previousRelation, nextRelation) &&
      previousRelation.label !== nextRelation.label;
    const isAutoLabelChangeOnly =
      onlyLabelChanged &&
      previousRelation.labelMode === "auto" &&
      nextRelation.labelMode === "auto";

    if (isAutoLabelChangeOnly) {
      continue;
    }

    const relationChanged =
      !relationWithoutLabelEquals(previousRelation, nextRelation) ||
      previousRelation.label !== nextRelation.label;

    if (!relationChanged) {
      continue;
    }

    const previousFromEndpoint = resolveEndpoint(
      previousSnapshot,
      previousRelation.fromTableId,
      previousRelation.fromFieldId
    );
    const previousToEndpoint = resolveEndpoint(
      previousSnapshot,
      previousRelation.toTableId,
      previousRelation.toFieldId
    );
    const nextFromEndpoint = resolveEndpoint(
      nextSnapshot,
      nextRelation.fromTableId,
      nextRelation.fromFieldId
    );
    const nextToEndpoint = resolveEndpoint(
      nextSnapshot,
      nextRelation.toTableId,
      nextRelation.toFieldId
    );

    activities.push({
      workspaceId,
      diagramId,
      actorUserId,
      actionType: "EDGE_UPDATE",
      entityType: "EDGE",
      entityId: edgeId,
      summary: `updated relationship ${nextFromEndpoint} -> ${nextToEndpoint}`,
      metadata: {
        actorRole,
        pageId: nextRelation.pageId,
        previous: {
          fromEndpoint: previousFromEndpoint,
          toEndpoint: previousToEndpoint,
          relationType: previousRelation.relationType,
          fromOptional: previousRelation.fromOptional,
          toOptional: previousRelation.toOptional,
          labelMode: previousRelation.labelMode,
          label: previousRelation.label,
        },
        next: {
          fromEndpoint: nextFromEndpoint,
          toEndpoint: nextToEndpoint,
          relationType: nextRelation.relationType,
          fromOptional: nextRelation.fromOptional,
          toOptional: nextRelation.toOptional,
          labelMode: nextRelation.labelMode,
          label: nextRelation.label,
        },
      },
    });
  }

  return activities;
};

