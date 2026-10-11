import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getFixtures, getLiveSnapshot } from "@/lib/football";
import type { Fixture, LiveMatchSnapshot } from "@/lib/types/football";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
/** Kick-off within this window counts as "may be live" even if Football-Data.org has not flipped the status yet. */
const MAY_BE_LIVE_BEFORE_MS = 5 * 60_000;
const MAY_BE_LIVE_AFTER_MS = 3 * 60 * 60_000;

const isLfc = (f: Fixture) => f.teams.home.id === 40 || f.teams.away.id === 40;

/** The fixture with ESPN's fresher score and clock laid over Football-Data.org's. */
function withLive(f: Fixture, live: LiveMatchSnapshot): Fixture {
  return {
    ...f,
    fixture: { ...f.fixture, status: { ...f.fixture.status, short: live.statusShort, elapsed: live.minute } },
    goals: live.score.home !== null && live.score.away !== null ? live.score : f.goals,
  };
}

type LivePayload = { fixture: Fixture | null; live: LiveMatchSnapshot | null };

/**
 * Cached for 30s on the server as well as on the CDN, so ESPN is asked at most
 * twice a minute per server instance whoever is watching (and in dev, where
 * there is no CDN). A failed ESPN read is cached as "no snapshot" for those
 * 30s, which is fine; a thrown error is not cached and retries next time.
 */
const getLivePayload = unstable_cache(
  async (): Promise<LivePayload> => {
    const fixtures = (await getFixtures()).filter(isLfc);
    const now = Date.now();
    const candidate =
      fixtures.find((f) => LIVE_STATUSES.has(f.fixture.status.short)) ??
      fixtures.find((f) => {
        const kickOff = new Date(f.fixture.date).getTime();
        return !FINISHED.has(f.fixture.status.short) && kickOff - MAY_BE_LIVE_BEFORE_MS <= now && now <= kickOff + MAY_BE_LIVE_AFTER_MS;
      });

    const live = candidate ? await getLiveSnapshot(candidate.fixture.date) : null;
    // ESPN is the fresher source: trust it when it says the match is (or is no longer) in play.
    const isLive = live ? live.state === "in" : !!candidate && LIVE_STATUSES.has(candidate.fixture.status.short);
    const fixture = candidate && isLive ? (live ? withLive(candidate, live) : candidate) : null;
    return { fixture, live: fixture ? live : null };
  },
  ["live-fixture-v1"],
  { revalidate: 30 },
);

/* Returns the live Liverpool fixture (or null) and, when ESPN has it, a snapshot
   of clock, goals, cards and key stats. Polled once a minute by the live match cards. */
export async function GET() {
  try {
    return NextResponse.json(
      await getLivePayload(),
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ fixture: null, live: null }, { status: 500 });
  }
}
