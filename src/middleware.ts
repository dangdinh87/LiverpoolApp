import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseFetch } from "@/lib/supabase-fetch-with-timeout";

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile"];

// Routes that are always dynamic (auth-dependent or API)
const DYNAMIC_PREFIXES = ["/api/", "/auth/", "/profile"];
const NOINDEX_PREFIXES = ["/auth/", "/profile"];

function addNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isDynamic = DYNAMIC_PREFIXES.some((r) => pathname.startsWith(r));

  // For protected routes: full auth check with Supabase
  if (isProtected) {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });

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
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addNoIndex(NextResponse.redirect(loginUrl));
    }

    return addNoIndex(response);
  }

  // Locale-sensitive public pages vary by cookie/header, so avoid shared CDN cache
  // but allow a short private browser cache to improve repeat page loads.
  if (!isDynamic) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
    response.headers.set("Vary", "Cookie, Accept-Language");
    return response;
  }

  const response = NextResponse.next();
  if (NOINDEX_PREFIXES.some((r) => pathname.startsWith(r))) {
    return addNoIndex(response);
  }
  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
