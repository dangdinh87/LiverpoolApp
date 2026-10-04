import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseFetch } from "@/lib/supabase-fetch-with-timeout";

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile"];

function addNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));

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

  // Only /auth/* reaches here (see matcher).
  return addNoIndex(NextResponse.next());
}

// Scoped to the two route groups that need it. Matching every page made each
// view (and each crawler hit) a billed edge invocation in the visitor's region,
// and the private Cache-Control it set on public pages was overwritten by the
// dynamic render's own header anyway.
export const config = {
  matcher: ["/profile/:path*", "/auth/:path*"],
};
