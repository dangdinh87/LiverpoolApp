-- 008. Repair articles.is_active / articles.read_count left NULL by bulk upserts.
--
-- Cause: the hourly sync upserts a batch of rows through PostgREST, which sends
-- the UNION of the rows' keys and writes NULL for any key a row lacks, bypassing
-- the column DEFAULT. Batches mixing new rows (is_active/read_count set) with
-- existing rows (not set) wrote `is_active = NULL` over the existing ones, and
-- every `.eq("is_active", true)` read then hid them (244 of 400 stored articles
-- in Oct 2026). The code now carries both keys on every row
-- (mergeArticleRowForUpsert in src/lib/news/sync.ts); this migration repairs the
-- rows already damaged and hardens the columns.
--
-- Safe to re-run: every statement is a no-op once the data is clean.
-- Run it AFTER the fixed sync is deployed (an old deployment would hit the NOT NULL
-- constraint on its next mixed batch instead of silently hiding rows).
--
-- Soft-deleted rows (is_active = false) are left alone: only NULL becomes visible.

UPDATE articles SET is_active  = true WHERE is_active  IS NULL;
UPDATE articles SET read_count = 0    WHERE read_count IS NULL;

ALTER TABLE articles ALTER COLUMN is_active  SET DEFAULT true;
ALTER TABLE articles ALTER COLUMN read_count SET DEFAULT 0;

-- SET NOT NULL only when no NULL is left (re-checked here so a concurrent write
-- between the UPDATE above and this block cannot make the migration fail halfway).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM articles WHERE is_active IS NULL) THEN
    ALTER TABLE articles ALTER COLUMN is_active SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM articles WHERE read_count IS NULL) THEN
    ALTER TABLE articles ALTER COLUMN read_count SET NOT NULL;
  END IF;
END
$$;
