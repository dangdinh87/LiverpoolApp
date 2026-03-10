-- Article likes & comments — social engagement for news articles
-- Requires auth.users (Supabase Auth) + articles table (002_articles.sql)

-- ============================================================
-- Likes
-- ============================================================
CREATE TABLE IF NOT EXISTS article_likes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, article_url)
);

CREATE INDEX idx_article_likes_url ON article_likes (article_url);
CREATE INDEX idx_article_likes_user ON article_likes (user_id);

-- ============================================================
-- Comments
-- ============================================================
CREATE TABLE IF NOT EXISTS article_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_url TEXT NOT NULL,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_article_comments_url ON article_comments (article_url, created_at DESC);
CREATE INDEX idx_article_comments_user ON article_comments (user_id);

-- ============================================================
-- RLS — users manage their own, public read
-- ============================================================
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- Likes: anyone can read counts, auth users manage own
CREATE POLICY "Public read likes"
  ON article_likes FOR SELECT TO public
  USING (true);

CREATE POLICY "Users manage own likes"
  ON article_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own likes"
  ON article_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comments: anyone can read, auth users manage own
CREATE POLICY "Public read comments"
  ON article_comments FOR SELECT TO public
  USING (true);

CREATE POLICY "Users insert own comments"
  ON article_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own comments"
  ON article_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own comments"
  ON article_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
