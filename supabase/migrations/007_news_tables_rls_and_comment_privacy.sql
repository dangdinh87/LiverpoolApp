-- 1. Row Level Security for the news tables.
--
-- 002 left `articles` and `sync_logs` without RLS ("server-only write via
-- service role"), and 006 did the same for `news_digests`. Supabase grants the
-- anon role on `public` by default, so anyone holding the public anon key could
-- PATCH/DELETE these tables through PostgREST — including writing script into
-- `articles.content_en`, which the article page renders as HTML.
--
-- Every read and write in the app goes through the service-role client, which
-- bypasses RLS, so enabling it changes nothing for the app. Public SELECT is
-- kept for the two tables whose content is public anyway.

ALTER TABLE articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read articles" ON articles;
CREATE POLICY "Public read articles"
  ON articles FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public read digests" ON news_digests;
CREATE POLICY "Public read digests"
  ON news_digests FOR SELECT TO anon, authenticated
  USING (true);

-- sync_logs: no policies on purpose — service role only.

-- 2. Columns the comments API writes but no migration ever created
--    (prod has them; a fresh database built from migrations did not).

ALTER TABLE article_comments
  ADD COLUMN IF NOT EXISTS author_name   TEXT,
  ADD COLUMN IF NOT EXISTS author_avatar TEXT,
  ADD COLUMN IF NOT EXISTS parent_id     UUID REFERENCES article_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_to_name TEXT;

-- 3. Comment author names used to fall back to the commenter's full email
--    address, which the public comments endpoint returned to every visitor.
UPDATE article_comments SET author_name = 'Fan'       WHERE author_name   LIKE '%@%';
UPDATE article_comments SET reply_to_name = 'Fan'     WHERE reply_to_name LIKE '%@%';
