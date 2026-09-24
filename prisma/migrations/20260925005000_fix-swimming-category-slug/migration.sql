-- Convert the already-created Bangla swimming category to its English URL slug.
UPDATE "Category"
SET "slug" = 'swimming'
WHERE "name" = 'সাঁতার'
  AND "slug" = 'সাঁতার'
  AND NOT EXISTS (
    SELECT 1 FROM "Category" WHERE "slug" = 'swimming'
  );
