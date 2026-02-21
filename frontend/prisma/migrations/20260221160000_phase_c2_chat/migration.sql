-- CreateEnum
CREATE TYPE "ChatThreadType" AS ENUM ('WORKSPACE_GENERAL', 'DIAGRAM');

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ChatThreadType" NOT NULL,
    "diagramId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_workspaceId_diagramId_key" ON "ChatThread"("workspaceId", "diagramId");

-- CreateIndex
CREATE INDEX "ChatThread_workspaceId_type_idx" ON "ChatThread"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "ChatThread_workspaceId_updatedAt_idx" ON "ChatThread"("workspaceId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ChatThread_diagramId_idx" ON "ChatThread"("diagramId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_workspace_general_unique" ON "ChatThread"("workspaceId", "type")
WHERE "type" = 'WORKSPACE_GENERAL';

-- CreateIndex
CREATE UNIQUE INDEX "ChatThread_workspace_diagram_unique" ON "ChatThread"("workspaceId", "diagramId")
WHERE "type" = 'DIAGRAM' AND "diagramId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_workspaceId_createdAt_idx" ON "ChatMessage"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_senderUserId_createdAt_idx" ON "ChatMessage"("senderUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;