-- Add configurable public navigation settings for categories
ALTER TABLE "Category"
ADD COLUMN "showInNav" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "navOrder" INTEGER NOT NULL DEFAULT 0;

-- Preserve the existing navigation order for categories that already exist.
UPDATE "Category"
SET "navOrder" = "id";
