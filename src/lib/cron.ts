import { type NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export function verifyCronRequest(req: NextRequest): boolean {
  const secret =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = getEnv("CRON_SECRET");

  if (!expectedSecret || secret?.trim() !== expectedSecret) {
    return false;
  }

  return true;
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
