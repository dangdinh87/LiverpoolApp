import { type NextRequest } from "next/server";

export function verifyCronRequest(req: NextRequest): boolean {
  const secret =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return false;
  }

  return true;
}
