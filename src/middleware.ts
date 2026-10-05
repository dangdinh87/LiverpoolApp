import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseFetch } from "@/lib/supabase-fetch-with-timeout";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

// Routes that require authentication (matched without the /en prefix)
const PROTECTED_ROUTES = ["/profile"];
const NOINDEX_PREFIXES = ["/auth", "/profile"];

function addNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function splitLocalePrefix(pathname: string): { path: string; prefix: string } {
  return /^\/en(?=\/|$)/.test(pathname)
    ? { path: pathname.slice(3) || "/", prefix: "/en" }
    : { path: pathname, prefix: "" };
}

export async function middleware(request: NextRequest) {
  // Rewrites /x → /vi/x (or redirects to /en/x when the NEXT_LOCALE cookie or
  // Accept-Language asks for English) so pages can be prerendered per locale.
  const response = handleI18nRouting(request);
  const { path, prefix } = splitLocalePrefix(request.nextUrl.pathname);

  if (PROTECTED_ROUTES.some((r) => path.startsWith(r))) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Bounded fetch: this runs on every request to a protected route, so an
        // unreachable auth service must fail fast instead of hanging the edge.
        global: { fetch: createSupabaseFetch() },
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Treat an unreachable auth service as "not signed in": redirecting to the
    // login page is a worse outcome than a 500, but far better than a hang.
    const user = await supabase.auth
      .getUser()
      .then(({ data }) => data.user)
      .catch(() => null);

    if (!user) {
      const loginUrl = new URL(`${prefix}/auth/login`, request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return addNoIndex(NextResponse.redirect(loginUrl));
    }
  }

  if (NOINDEX_PREFIXES.some((r) => path.startsWith(r))) addNoIndex(response);
  return response;
}

export const config = {
  // Every page needs the locale rewrite. Skipped: API routes, the OAuth callback
  // (not localized), Next/Vercel internals, the root OG image route, the Google
  // site-verification file, and real static-asset extensions (robots.txt,
  // sitemap.xml, images, manifest).
  //
  // This used to exclude "any path with a dot" (`.*\..*`), which also matched
  // scraped Vietnamese news URLs — many keep their source's literal `.html`
  // suffix (e.g. bongda24h.com.vn, 24h.com.vn) via encodeArticleSlug(). Those
  // never got rewritten to /vi/news/... and 404'd. Matching a known extension
  // list instead of "contains a dot" fixes that.
  matcher: [
    "/((?!api|auth/callback|_next|_vercel|opengraph-image|google583c5c945cf216b2\\.html|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|css|js|json|xml|txt|docx|woff2?|ttf|map)$).*)",
  ],
};
