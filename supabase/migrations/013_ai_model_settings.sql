-- Runtime AI model chains per feature slot (digest, translate, site_articles).
--
-- Reads and writes go exclusively through the service-role client on the server
-- (`src/lib/ai/model-settings.ts` and `/api/internal/ai-models`), so RLS is
-- enabled with no anon or authenticated policies (matching `sync_logs`).

CREATE TABLE IF NOT EXISTS public.ai_model_settings (
  slot        TEXT PRIMARY KEY,
  models      TEXT[] NOT NULL CHECK (cardinality(models) BETWEEN 1 AND 5),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;
