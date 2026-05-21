-- Daily digest storage with SEO article payload.
-- Existing projects may already have news_digests; keep this migration additive.

CREATE TABLE IF NOT EXISTS news_digests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_date   DATE UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  sections      JSONB NOT NULL DEFAULT '[]'::jsonb,
  article_ids   TEXT[] DEFAULT '{}',
  article_count INTEGER DEFAULT 0,
  model         TEXT,
  tokens_used   INTEGER DEFAULT 0,
  generated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE news_digests
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_article JSONB;

CREATE INDEX IF NOT EXISTS idx_news_digests_date
  ON news_digests (digest_date DESC);
