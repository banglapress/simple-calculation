ALTER TABLE "Post" ADD COLUMN "externalDraftId" TEXT;

CREATE UNIQUE INDEX "Post_externalDraftId_key" ON "Post"("externalDraftId");
