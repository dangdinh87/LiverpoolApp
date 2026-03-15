-- Gallery images: stores metadata for Cloudinary-hosted images
CREATE TABLE IF NOT EXISTS gallery_images (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url       TEXT NOT NULL,
  alt                  TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL DEFAULT 'anfield',
  width                INT,
  height               INT,
  is_homepage_eligible BOOLEAN DEFAULT false,
  sort_order           INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_images (category);
CREATE INDEX IF NOT EXISTS idx_gallery_sort ON gallery_images (sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_homepage ON gallery_images (is_homepage_eligible) WHERE is_homepage_eligible = true;

-- Site settings: key-value store for site-wide config (e.g. homepage hero image)
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: gallery_images
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery images"
  ON gallery_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert gallery images"
  ON gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

CREATE POLICY "Admin can update gallery images"
  ON gallery_images FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

CREATE POLICY "Admin can delete gallery images"
  ON gallery_images FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

-- RLS: site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can insert site settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');

CREATE POLICY "Admin can update site settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'email' = 'nguyendangdinh47@gmail.com');
