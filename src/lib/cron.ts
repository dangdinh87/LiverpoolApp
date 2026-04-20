import { type NextRequest, NextResponse } from "next/server";

export function verifyCronRequest(req: NextRequest): boolean {
  const secret =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return false;
  }

  return true;
}

export function withCronAuth<T = Record<string, unknown>>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, context: T) => {
    if (!verifyCronRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, context);
  };
}
