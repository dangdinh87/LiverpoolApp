import type { NextRequest } from "next/server";

/**
 * Verify that browser-originated mutations come from the same host.
 * Requests with neither `Origin` nor `Referer` (server-to-server / direct API clients)
 * are permitted consistently across Route Handlers.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
  const requestHost = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return Boolean(requestHost && originHost === requestHost);
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      return Boolean(requestHost && refererHost === requestHost);
    } catch {
      return false;
    }
  }

  return true;
}
