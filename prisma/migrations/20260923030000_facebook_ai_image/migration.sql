-- Add dedicated AI-generated Facebook image fields to posts
ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "facebookImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "facebookImagePrompt" TEXT;
