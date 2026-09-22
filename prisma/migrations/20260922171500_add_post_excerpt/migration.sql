ALTER TABLE "Post"
ADD COLUMN "excerpt" TEXT;

UPDATE "Post"
SET "excerpt" = LEFT(
  REGEXP_REPLACE(
    REGEXP_REPLACE(COALESCE("content", ''), '<[^>]+>', '', 'g'),
    '[[:space:]]+',
    ' ',
    'g'
  ),
  180
)
WHERE "content" IS NOT NULL;
