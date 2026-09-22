ALTER TABLE "Post" ADD COLUMN "sourceUrl" TEXT;

ALTER TABLE "NewsFeed" ADD COLUMN "includeKeywords" TEXT;
ALTER TABLE "NewsFeed" ADD COLUMN "excludeKeywords" TEXT;
ALTER TABLE "NewsFeed" ADD COLUMN "minRelevance" INTEGER NOT NULL DEFAULT 60;

CREATE INDEX "Post_sourceUrl_idx" ON "Post"("sourceUrl");
