import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";
import { createSupabaseFetch } from "@/lib/supabase-fetch-with-timeout";

/** Shared service-role Supabase client for news module (bypasses RLS). */
export function getServiceClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase env vars");
  // Bounded fetch: a paused/unreachable database must fail fast, not hang.
  return createClient(url, key, {
    global: { fetch: createSupabaseFetch() },
  });
}
