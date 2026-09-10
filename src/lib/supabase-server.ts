// Server-only: never import this in client components
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseFetch } from '@/lib/supabase-fetch-with-timeout';

/**
 * Server-side Supabase client with cookie-based session.
 * Use in Server Components, Route Handlers, Server Actions.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Bounded fetch: a paused/unreachable database must fail fast, not hang.
      global: { fetch: createSupabaseFetch() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore error when called from a Server Component or GET route handler
          }
        },
      },
    },
  );
}
