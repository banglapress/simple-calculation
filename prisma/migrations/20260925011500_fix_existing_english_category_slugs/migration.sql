-- Existing categories created before explicit English slug handling.
-- Convert their URL slugs without changing category/post relations.
UPDATE "Category"
SET "slug" = 'swimming'
WHERE "name" = 'সাঁতার'
  AND "slug" = 'সাঁতার'
  AND NOT EXISTS (
    SELECT 1 FROM "Category" WHERE "slug" = 'swimming'
  );

UPDATE "Category"
SET "slug" = 'boxing'
WHERE "name" = 'বক্সিং'
  AND "slug" = 'বক্সিং'
  AND NOT EXISTS (
    SELECT 1 FROM "Category" WHERE "slug" = 'boxing'
  );
