-- Articles the site writes itself, as opposed to the excerpt-and-link mirrors
-- in `articles`.
--
-- Those mirrors are other publishers' stories and are served noindex; these are
-- built from the site's own match data and are the only pages here Google has
-- any reason to rank. Keeping them in a separate table keeps that distinction
-- impossible to lose: nothing joins the two, and the news cleanup job that
-- soft-deletes old mirrors cannot reach these.

CREATE TABLE IF NOT EXISTS site_articles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('review','preview','weekly','digest','history')),

  -- The fixture a match article belongs to, when it has one.
  fixture_id    INTEGER,

  -- Same shape as articles.content_en / content_vi, so the readers and the
  -- translation path already know how to handle it.
  content_en    JSONB,
  content_vi    JSONB,

  -- What the article was allowed to say. Kept so a published piece can be
  -- re-checked later, and so a rejection can be explained without guessing.
  facts         JSONB NOT NULL,

  -- A draft that fails validation is stored, not discarded: a rejection is the
  -- only signal that the generator has drifted, and it is worth nothing if it
  -- cannot be read afterwards.
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','rejected')),
  reject_reason TEXT,

  model         TEXT,
  generated_at  TIMESTAMPTZ DEFAULT now(),
  published_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_articles_kind_published
  ON site_articles (kind, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_articles_published
  ON site_articles (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_site_articles_fixture
  ON site_articles (fixture_id) WHERE fixture_id IS NOT NULL;

-- Same posture as migration 007: reads are public because the content is
-- public; every write goes through the service-role client, which bypasses RLS.
-- Rejected drafts stay private — they are the site's own quality signal, and a
-- half-wrong article is exactly what should not be readable.
ALTER TABLE site_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published site articles" ON site_articles;
CREATE POLICY "Public read published site articles"
  ON site_articles FOR SELECT TO anon, authenticated
  USING (status = 'published');
