import type { NewsArticle } from "@/lib/news/types";
import { clusterStories } from "@/lib/news/story-clusters";

export { decodeEntities, cleanTitle } from "@/components/news/news-text";

const TARGET_COUNT = 6;
const MIN_VISIBLE = 4;
const FRESH_HOURS = 48;
const STALE_HOURS = 18;
const HOUR_MS = 3_600_000;

const time = (a: NewsArticle) => new Date(a.pubDate).getTime();

/**
 * Pick the articles for the homepage: viewer-language first, topped up from the
 * other language when that feed is sparse or stale.
 *
 * Freshness is measured against the newest article held, not the wall clock, so
 * the result is a pure function of its input (stable across ISR and hydration).
 *
 * One card per story. /news has grouped rewrites of the same story since the
 * clusterer shipped, but this list never did, so seven slots could hold three
 * versions of one injury update — Liverpool Echo, liverpool.com and the Mirror
 * are all Reach plc and syndicate within the group, so the feed receives those
 * rewrites as a matter of course. `clusterStories` is pure, so it runs here on
 * the server exactly as it does on the client.
 */
export function selectHomeNews(articles: NewsArticle[], lang: "vi" | "en", count = TARGET_COUNT): NewsArticle[] {
  const leads = clusterStories(articles).map((story) => story.lead);
  const sortedAll = [...leads].sort((a, b) => time(b) - time(a));
  if (sortedAll.length === 0) return [];

  const nowMs = time(sortedAll[0]);
  const freshCutoff = nowMs - FRESH_HOURS * HOUR_MS;
  const freshAll = sortedAll.filter((a) => time(a) >= freshCutoff);
  const primary = sortedAll.filter((a) => a.language === lang);
  const newestPrimary = primary.length ? time(primary[0]) : 0;
  const primaryIsStale = !newestPrimary || nowMs - newestPrimary > STALE_HOURS * HOUR_MS;

  if (primaryIsStale) {
    if (freshAll.length >= MIN_VISIBLE) return freshAll.slice(0, count);
    return sortedAll.slice(0, count);
  }

  const freshPrimary = freshAll.filter((a) => a.language === lang);
  const freshSecondary = freshAll.filter((a) => a.language !== lang);
  const composed = [...freshPrimary, ...freshSecondary].slice(0, count);
  if (composed.length < MIN_VISIBLE) {
    for (const a of sortedAll) {
      if (composed.length >= count) break;
      if (!composed.some((x) => x.link === a.link)) composed.push(a);
    }
  }
  return composed;
}
