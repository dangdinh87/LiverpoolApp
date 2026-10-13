// The season's fixture list, shared across requests.
//
// `getFixtures` is wrapped in `React.cache`, which deduplicates calls within a
// single render and nothing more. Every page that renders it therefore spends
// its own Football-Data.org request — and the free tier allows 10 per minute.
// Article pages are the worst case: one ISR entry per URL per locale, each
// render asking the provider again just to name the next match. A crawl or a
// build that warms many of them at once is what produces the 429s.
//
// Deliberately not re-exported from ./index: this module imports from there,
// and exporting it back would close the cycle.

import "server-only";
import { unstable_cache } from "next/cache";
import { getFixtures } from "./index";
import type { Fixture } from "@/lib/types/football";

/**
 * 30 minutes. A fixture list only changes when a match is played or the
 * calendar is rearranged, so this is generous; the point is that it is shared.
 *
 * Not for the live path. `/api/live-fixture` and `/fixtures/[id]` read match
 * status while a game is on and must keep asking the provider directly.
 */
const FIXTURES_TTL_SEC = 1800;

/** Season fixture list for pages that only need the schedule, not live status. */
export const getCachedFixtures = unstable_cache(
  async (): Promise<Fixture[]> => getFixtures(),
  ["season-fixtures-v1"],
  { revalidate: FIXTURES_TTL_SEC },
);
