ALTER TABLE "ChatMessage" ADD COLUMN "clientMessageId" TEXT;

CREATE UNIQUE INDEX "ChatMessage_senderUserId_clientMessageId_key"
ON "ChatMessage"("senderUserId", "clientMessageId");