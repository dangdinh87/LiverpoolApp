-- Repairs what 007 declared but the database never received, plus two
-- functions that were reachable from the public API.
--
-- Found by auditing the live database against the migrations: `articles` and
-- `sync_logs` were still RLS-disabled while `anon` held INSERT, UPDATE, DELETE
-- and TRUNCATE on both. The anon key ships in the client bundle, so anybody
-- could have rewritten `articles.content_en` — which the article page renders
-- as HTML — or emptied the table. Migrations describe intent; only the database
-- says what is true.
--
-- Every read and write in the app uses the service-role client, which bypasses
-- RLS, so none of this changes application behaviour.

ALTER TABLE articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read articles" ON articles;
CREATE POLICY "Public read articles"
  ON articles FOR SELECT TO anon, authenticated
  USING (true);

-- sync_logs keeps no policy on purpose: operational data, service role only.

-- Both of these only make sense fired by a trigger, yet PostgREST published
-- them at /rest/v1/rpc/ and handle_new_user runs SECURITY DEFINER. Pinning
-- search_path stops a definer function being aimed at a caller's schema.
-- Revoking EXECUTE does not affect trigger firing, which checks the privilege
-- when the trigger is created, not when it runs.

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.preserve_published_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.published_at IS NULL AND OLD.published_at IS NOT NULL THEN
    NEW.published_at = OLD.published_at;
  END IF;
  RETURN NEW;
END;
$function$;

-- Postgres grants EXECUTE to PUBLIC on every new function, and CREATE OR
-- REPLACE re-applies it, so PUBLIC has to be named here too.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.preserve_published_at() FROM PUBLIC, anon, authenticated;
