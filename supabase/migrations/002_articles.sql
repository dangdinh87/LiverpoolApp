-- News articles persistence + translation cache
-- Stores crawled articles from 18 sources (EN + VI)

CREATE TABLE IF NOT EXISTS articles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url          TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  snippet      TEXT DEFAULT '',
  thumbnail    TEXT,
  source       TEXT NOT NULL,
  language     TEXT NOT NULL DEFAULT 'en',
  category     TEXT DEFAULT 'general',
  relevance    FLOAT DEFAULT 0,
  published_at TIMESTAMPTZ,
  fetched_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),

  -- Article metadata
  author       TEXT,
  hero_image   TEXT,
  word_count   INT,
  tags         TEXT[] DEFAULT '{}',

  -- SEO & analytics
  slug         TEXT,
  read_count   INT DEFAULT 0,
  content_hash TEXT,

  -- Translation (NULL = not yet translated)
  title_vi     TEXT,
  snippet_vi   TEXT,
  content_vi   JSONB,  -- { paragraphs: string[], translatedAt: string }

  -- Lifecycle
  is_active    BOOLEAN DEFAULT true
);

-- Performance indexes
CREATE INDEX idx_articles_relevance ON articles (relevance DESC) WHERE is_active = true;
CREATE INDEX idx_articles_language  ON articles (language) WHERE is_active = true;
CREATE INDEX idx_articles_source    ON articles (source);
CREATE INDEX idx_articles_published ON articles (published_at DESC);
CREATE INDEX idx_articles_slug      ON articles (slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_articles_category  ON articles (category) WHERE is_active = true;
CREATE INDEX idx_articles_tags      ON articles USING gin(tags) WHERE is_active = true;

-- Full-text search (works for both EN and VI via 'simple' config)
ALTER TABLE articles ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(title_vi, '') || ' ' ||
      coalesce(snippet, '') || ' ' ||
      coalesce(author, '')
    )
  ) STORED;
CREATE INDEX idx_articles_fts ON articles USING gin(fts);

-- Sync logs — track cron health
CREATE TABLE IF NOT EXISTS sync_logs (
  id          SERIAL PRIMARY KEY,
  ran_at      TIMESTAMPTZ DEFAULT now(),
  inserted    INT DEFAULT 0,
  updated     INT DEFAULT 0,
  failed      INT DEFAULT 0,
  duration_ms INT,
  errors      JSONB
);

-- No RLS on articles (public read, server-only write via service role)
-- sync_logs is server-only too
