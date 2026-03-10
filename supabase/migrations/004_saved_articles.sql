-- Saved articles (bookmarks) per user
CREATE TABLE saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url text NOT NULL,
  article_title text NOT NULL,
  article_snippet text,
  article_thumbnail text,
  article_source text,
  article_language text DEFAULT 'en',
  article_published_at timestamptz,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_url)
);

-- Index for fast lookup by user
CREATE INDEX idx_saved_articles_user ON saved_articles(user_id, saved_at DESC);

-- Enable RLS
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved articles
CREATE POLICY "Users can view own saved articles"
  ON saved_articles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save articles
CREATE POLICY "Users can save articles"
  ON saved_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave their own articles
CREATE POLICY "Users can unsave own articles"
  ON saved_articles FOR DELETE
  USING (auth.uid() = user_id);
