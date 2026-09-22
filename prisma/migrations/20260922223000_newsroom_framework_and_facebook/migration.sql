CREATE TYPE "DeskStoryStatus" AS ENUM ('NEW', 'RESEARCHING', 'DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED');
CREATE TYPE "FacebookStatus" AS ENUM ('NONE', 'READY', 'PUBLISHED', 'FAILED');

ALTER TABLE "Post"
  ADD COLUMN "facebookCaption" TEXT,
  ADD COLUMN "facebookAutoPost" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "facebookStatus" "FacebookStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "facebookPostId" TEXT,
  ADD COLUMN "facebookPublishedAt" TIMESTAMP(3),
  ADD COLUMN "facebookError" TEXT;

ALTER TABLE "NewsFeed"
  ADD COLUMN "categoryId" INTEGER;

CREATE INDEX "NewsFeed_categoryId_idx" ON "NewsFeed"("categoryId");

CREATE TABLE "DeskStory" (
  "id" TEXT NOT NULL,
  "titleHint" TEXT NOT NULL,
  "status" "DeskStoryStatus" NOT NULL DEFAULT 'NEW',
  "categoryId" INTEGER,
  "postId" TEXT,
  "sourceCount" INTEGER NOT NULL DEFAULT 0,
  "relevanceScore" INTEGER,
  "relevanceReason" TEXT,
  "researchStatus" TEXT,
  "researchPacket" JSONB,
  "articleStatus" TEXT,
  "articleWarnings" JSONB,
  "warning" TEXT,
  "lastError" TEXT,
  "autoAttempts" INTEGER NOT NULL DEFAULT 0,
  "autoProcessingStartedAt" TIMESTAMP(3),
  "autoNextAttemptAt" TIMESTAMP(3),
  "autoFailureStage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeskStory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeskStory_postId_key" ON "DeskStory"("postId");
CREATE INDEX "DeskStory_status_updatedAt_idx" ON "DeskStory"("status", "updatedAt");
CREATE INDEX "DeskStory_status_autoNextAttemptAt_updatedAt_idx" ON "DeskStory"("status", "autoNextAttemptAt", "updatedAt");
CREATE INDEX "DeskStory_categoryId_status_updatedAt_idx" ON "DeskStory"("categoryId", "status", "updatedAt");

CREATE TABLE "DeskStorySource" (
  "id" TEXT NOT NULL,
  "storyId" TEXT NOT NULL,
  "feedId" INTEGER,
  "url" TEXT NOT NULL,
  "canonicalUrl" TEXT,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "rawText" TEXT,
  "imageUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "origin" TEXT NOT NULL DEFAULT 'rss',
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeskStorySource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeskStorySource_storyId_url_key" ON "DeskStorySource"("storyId", "url");
CREATE INDEX "DeskStorySource_url_idx" ON "DeskStorySource"("url");
CREATE INDEX "DeskStorySource_feedId_createdAt_idx" ON "DeskStorySource"("feedId", "createdAt");

CREATE TABLE "DeskJob" (
  "id" TEXT NOT NULL,
  "storyId" TEXT,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "payload" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "DeskJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeskJob_stage_createdAt_idx" ON "DeskJob"("stage", "createdAt");
CREATE INDEX "DeskJob_storyId_createdAt_idx" ON "DeskJob"("storyId", "createdAt");

ALTER TABLE "NewsFeed"
  ADD CONSTRAINT "NewsFeed_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskStory"
  ADD CONSTRAINT "DeskStory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeskStory_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskStorySource"
  ADD CONSTRAINT "DeskStorySource_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "DeskStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeskStorySource_feedId_fkey"
  FOREIGN KEY ("feedId") REFERENCES "NewsFeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeskJob"
  ADD CONSTRAINT "DeskJob_storyId_fkey"
  FOREIGN KEY ("storyId") REFERENCES "DeskStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
