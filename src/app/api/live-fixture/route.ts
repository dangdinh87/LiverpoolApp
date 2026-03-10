import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/football";
import type { Fixture } from "@/lib/types/football";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);

/* Returns the first live Liverpool fixture (or null).
   Called by LiveMatchBanner every 60s for score updates. */
export async function GET() {
  try {
    const fixtures = await getFixtures();
    const live: Fixture | undefined = fixtures.find(
      (f) =>
        LIVE_STATUSES.has(f.fixture.status.short) &&
        (f.teams.home.id === 40 || f.teams.away.id === 40)
    );

    return NextResponse.json(
      { fixture: live ?? null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ fixture: null }, { status: 500 });
  }
}
