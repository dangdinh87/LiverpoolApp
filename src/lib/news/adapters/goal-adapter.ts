// Goal.com adapter — scrapes via Google News RSS (goal.com has no RSS feed).
// Resolves Google News redirect URLs to actual goal.com article URLs.

import Parser from "rss-parser";
import type { FeedAdapter } from "./base";
import type { NewsArticle } from "../types";

const GOOGLE_NEWS_RSS =
  "https://news.google.com/rss/search?q=site:goal.com+liverpool&hl=en-GB&gl=GB&ceid=GB:en";

const FETCH_TIMEOUT_MS = 12_000;
const RESOLVE_TIMEOUT_MS = 5_000;
const USER_AGENT = "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)";

const parser = new Parser();

/** Follow Google News redirect to get the actual article URL */
async function resolveGoogleNewsUrl(gnUrl: string): Promise<string | null> {
  try {
    const res = await fetch(gnUrl, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (location?.includes("goal.com")) return location;

    // Some redirects need a second hop
    if (location) {
      const res2 = await fetch(location, {
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
      });
      const loc2 = res2.headers.get("location");
      if (loc2?.includes("goal.com")) return loc2;
    }
    return null;
  } catch {
    return null;
  }
}

export class GoalAdapter implements FeedAdapter {
  readonly name = "goal";

  async fetch(): Promise<NewsArticle[]> {
    try {
      const res = await fetch(GOOGLE_NEWS_RSS, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.warn(`[goal-adapter] Google News RSS: HTTP ${res.status}`);
        return [];
      }

      const xml = await res.text();
      const feed = await parser.parseString(xml);

      // Resolve up to 10 articles (avoid excessive redirect requests)
      const items = feed.items.slice(0, 10);
      const results = await Promise.allSettled(
        items.map(async (item): Promise<NewsArticle | null> => {
          const realUrl = await resolveGoogleNewsUrl(item.link ?? "");
          if (!realUrl) return null;

          return {
            title: item.title ?? "Untitled",
            link: realUrl,
            pubDate: item.pubDate ?? "",
            contentSnippet: item.contentSnippet ?? "",
            source: "goal",
            language: "en",
          };
        }),
      );

      return results
        .filter((r): r is PromiseFulfilledResult<NewsArticle | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((a): a is NewsArticle => a !== null);
    } catch (err) {
      console.warn(
        "[goal-adapter] Failed:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}
