/**
 * Lazy access to the Supabase browser client.
 *
 * `@/lib/supabase` is ~60 KB gzip (auth + realtime + postgrest). Importing it
 * statically from a shared component puts it in the first-load JS of every page
 * for every visitor, signed in or not. The browser client keeps its session in
 * a cookie (`sb-<project>-auth-token`, optionally chunked `.0`, `.1`), so a
 * visitor without that cookie is a guest and the client is never needed to say so.
 */

/** True when a Supabase session cookie is present (client-side only). */
export function hasSupabaseSession(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)sb-[^=;]*-auth-token/.test(document.cookie);
}

/** Load the browser client on demand (separate chunk). */
export async function loadSupabaseClient() {
  const { createClient } = await import("@/lib/supabase");
  return createClient();
}
