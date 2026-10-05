import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError } from "./base";
import { cleanFeedText, cleanSnippet } from "../text";
import { canonicalizeArticleUrl } from "../url";
import { NEWS_USER_AGENT } from "../http";
import type { NewsArticle, NewsSource, NewsLanguage } from "../types";

interface LfcNewsItem {
  title: string;
  url: string;
  publishedAt: string;
  kicker?: string;
  /** Section: Club / Men / Women / Academy / Media Watch. */
  category?: string;
  /** Standfirst (one-sentence summary) — the real snippet; `kicker` is just a label. */
  byline?: string;
  coverImage?: {
    sizes?: {
      sm?: { webpUrl?: string; url?: string };
      md?: { webpUrl?: string; url?: string };
    };
  };
}

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

// Not men's-team news: women's / academy teams, press-roundup links and retail promos.
const SKIPPED_CATEGORIES = new Set(["women", "academy", "media watch"]);
const SKIPPED_KICKERS = new Set(["lfc retail", "retail"]);

export function isSkippedLfcItem(item: Pick<LfcNewsItem, "category" | "kicker">): boolean {
  const category = (item.category ?? "").trim().toLowerCase();
  const kicker = (item.kicker ?? "").trim().toLowerCase();
  return SKIPPED_CATEGORIES.has(category) || SKIPPED_KICKERS.has(kicker);
}

/** Parse the `__NEXT_DATA__` of liverpoolfc.com/news into articles (exported for tests). */
export function parseLfcNewsHtml(html: string): NewsArticle[] {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
  if (!match?.[1]) return [];

  const data = JSON.parse(match[1]);
  const results: LfcNewsItem[] = data?.props?.pageProps?.data?.newsPage?.results ?? [];

  return results
    .filter((item) => item?.title && item?.url && !isSkippedLfcItem(item))
    .slice(0, 30)
    .map((item) => {
      const img =
        item.coverImage?.sizes?.sm?.webpUrl ??
        item.coverImage?.sizes?.sm?.url ??
        item.coverImage?.sizes?.md?.webpUrl ??
        undefined;

      return {
        title: cleanFeedText(item.title),
        link: canonicalizeArticleUrl(`https://www.liverpoolfc.com${item.url}`),
        pubDate: item.publishedAt || new Date().toISOString(),
        contentSnippet: cleanSnippet(item.byline ?? ""),
        thumbnail: sanitizeUrl(img),
        source: "lfc" as NewsSource,
        language: "en" as NewsLanguage,
      };
    });
}

export class LfcAdapter implements FeedAdapter {
  readonly name = "lfc";
  status?: SourceFetchStatus;

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    try {
      const res = await fetch("https://www.liverpoolfc.com/news", {
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": NEWS_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        this.status = { state: "http_error", httpStatus: res.status };
        return [];
      }

      const html = await res.text();
      let articles: NewsArticle[];
      try {
        articles = parseLfcNewsHtml(html);
      } catch (err) {
        this.status = statusFromError(err, "parse");
        console.warn("[lfc-adapter] parse failed:", this.status.error);
        return [];
      }
      // Zero items from a 200 means the page shape changed, not "no news".
      this.status = articles.length > 0 ? { state: "ok" } : { state: "parse_error", error: "no items in __NEXT_DATA__" };
      return articles;
    } catch (err) {
      this.status = statusFromError(err);
      console.warn(
        "[lfc-adapter] Failed:",
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
