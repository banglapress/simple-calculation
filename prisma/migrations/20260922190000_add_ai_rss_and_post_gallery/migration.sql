ALTER TABLE "Post" ADD COLUMN "galleryImages" TEXT;

CREATE TABLE "NewsFeed" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NewsFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsFeed_url_key" ON "NewsFeed"("url");
