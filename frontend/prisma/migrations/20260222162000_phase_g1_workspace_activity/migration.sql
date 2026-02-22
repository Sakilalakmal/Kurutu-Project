CREATE TYPE "ActionType" AS ENUM (
  'DIAGRAM_CREATE',
  'DIAGRAM_UPDATE',
  'NODE_CREATE',
  'NODE_UPDATE',
  'NODE_DELETE',
  'EDGE_CREATE',
  'EDGE_UPDATE',
  'EDGE_DELETE',
  'FIELD_ADD',
  'FIELD_UPDATE',
  'FIELD_DELETE',
  'INVITE_CREATE',
  'INVITE_REVOKE',
  'MEMBER_JOIN',
  'MEMBER_ROLE_CHANGE',
  'MEMBER_REMOVE'
);

CREATE TYPE "EntityType" AS ENUM (
  'WORKSPACE',
  'DIAGRAM',
  'NODE',
  'EDGE',
  'FIELD',
  'INVITE',
  'MEMBER'
);

CREATE TABLE "WorkspaceActivity" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "diagramId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "actionType" "ActionType" NOT NULL,
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceActivity_workspaceId_createdAt_idx"
ON "WorkspaceActivity"("workspaceId", "createdAt" DESC);

CREATE INDEX "WorkspaceActivity_workspaceId_diagramId_createdAt_idx"
ON "WorkspaceActivity"("workspaceId", "diagramId", "createdAt" DESC);

ALTER TABLE "WorkspaceActivity"
ADD CONSTRAINT "WorkspaceActivity_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceActivity"
ADD CONSTRAINT "WorkspaceActivity_diagramId_fkey"
FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceActivity"
ADD CONSTRAINT "WorkspaceActivity_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
