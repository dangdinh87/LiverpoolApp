import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

/**
 * Cron routes accept the secret only as `Authorization: Bearer <secret>` —
 * the header Vercel cron sends automatically and the GitHub Action sets.
 * A `?key=` query param used to be accepted too, but URLs land in request
 * logs, proxy logs and browser history, so the secret leaked wherever it was used.
 */
export function verifyCronRequest(req: NextRequest): boolean {
  const expectedSecret = getEnv("CRON_SECRET");
  if (!expectedSecret) return false;

  const match = /^Bearer\s+(.+)$/.exec(req.headers.get("authorization") ?? "");
  if (!match) return false;

  const given = Buffer.from(match[1].trim());
  const expected = Buffer.from(expectedSecret);
  // timingSafeEqual throws on unequal lengths, so compare lengths first.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function withCronAuth(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ...args: unknown[]) => {
    if (!verifyCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, ...args);
  };
}
