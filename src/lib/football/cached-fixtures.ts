import "server-only";
import { unstable_cache } from "next/cache";
import { getFixtures } from "./index";
import { requireNonEmptyArray } from "./fdo-client";
import type { Fixture } from "@/lib/types/football";
import { FOOTBALL_CACHE_TAG } from "./cache-tags";

const FIXTURES_TTL_SEC = 21600;

const getCachedFixturesInner = unstable_cache(
  async (): Promise<Fixture[]> => requireNonEmptyArray(getFixtures()),
  ["season-fixtures-v2"],
  { revalidate: FIXTURES_TTL_SEC, tags: [FOOTBALL_CACHE_TAG] },
);

/**
 * Season fixture list for pages that only need the schedule, not live status.
 * Refuses to pin an empty `[]` in `unstable_cache` when upstream FDO errors out.
 */
export async function getCachedFixtures(): Promise<Fixture[]> {
  return getCachedFixturesInner().catch((err) => {
    if (err instanceof Error && err.message.includes("incrementalCache")) {
      return getFixtures().catch(() => []);
    }
    return [];
  });
}
