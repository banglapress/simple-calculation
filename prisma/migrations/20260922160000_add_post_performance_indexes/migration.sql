-- Performance indexes for the public news workload.

CREATE INDEX "Post_status_updatedAt_idx"
ON "Post"("status", "updatedAt");

CREATE INDEX "Post_status_placement_updatedAt_idx"
ON "Post"("status", "placement", "updatedAt");

CREATE INDEX "Post_status_isBreaking_updatedAt_idx"
ON "Post"("status", "isBreaking", "updatedAt");

CREATE INDEX "Post_authorId_idx"
ON "Post"("authorId");

CREATE INDEX "LiveScore_updatedAt_idx"
ON "LiveScore"("updatedAt");
