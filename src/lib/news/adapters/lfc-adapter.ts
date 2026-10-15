import * as cheerio from "cheerio";
import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError } from "./base";
import { cleanFeedText, cleanSnippet } from "../text";
import { canonicalizeArticleUrl } from "../url";
import { NEWS_USER_AGENT } from "../http";
import { normalizeFeedDate } from "../date";
import type { NewsArticle, NewsSource, NewsLanguage } from "../types";

/*
 * liverpoolfc.com moved to the App Router in October 2026: the listing page no
 * longer carries `__NEXT_DATA__`, and its cards only show a day, not a time.
 *
 * - The Google News sitemap lists ~2 days of stories with exact UTC times.
 * - It also lists Women, Academy and "Media Watch" (other outlets' transfer
 *   rumours, which would read as the club's own word), so a story is kept only
 *   when it also appears on the Men or Club category page. Those pages show the
 *   12 newest cards each, plus a JSON-LD list with the standfirst and image.
 */
const LFC_ORIGIN = "https://www.liverpoolfc.com";
const SITEMAP_URL = `${LFC_ORIGIN}/sitemap-news.xml`;
const KEPT_CATEGORY_PAGES = ["men", "club"].map((c) => `${LFC_ORIGIN}/news/category/${c}`);
const MAX_ITEMS = 30;

export interface LfcSitemapItem {
  url: string;
  title: string;
  publishedAt: string;
}

export interface LfcCard {
  url: string;
  snippet?: string;
  image?: string;
}

/** Story identity across the three spellings: `/news/x`, `…/news/x`, `…/en/news/x`. */
function slugOf(url: string): string {
  return url.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
}

function storyUrl(slug: string): string {
  return canonicalizeArticleUrl(`${LFC_ORIGIN}/news/${slug}`);
}

const THUMB_WIDTH = 640;

/** The card's `src` asks the Contentful proxy for the full-size original; ask for card width instead. */
function thumbnailUrl(src: string | undefined): string | undefined {
  if (!src || !/^https:\/\//i.test(src)) return undefined;
  try {
    const url = new URL(src);
    const w = Number(url.searchParams.get("w"));
    const h = Number(url.searchParams.get("h"));
    if (w > THUMB_WIDTH && h > 0) {
      url.searchParams.set("w", String(THUMB_WIDTH));
      url.searchParams.set("h", String(Math.round((THUMB_WIDTH * h) / w)));
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseLfcNewsSitemap(xml: string): LfcSitemapItem[] {
  const $ = cheerio.load(xml, { xml: true });
  return $("url")
    .map((_, el) => {
      const $el = $(el);
      const slug = slugOf($el.children("loc").text().trim());
      const title = cleanFeedText($el.find("news\\:title").text());
      const publishedAt = normalizeFeedDate($el.find("news\\:publication_date").text().trim(), "en");
      return slug && title && publishedAt ? { url: storyUrl(slug), title, publishedAt } : null;
    })
    .get()
    .filter((item): item is LfcSitemapItem => item !== null);
}

export function parseLfcCategoryPage(html: string): LfcCard[] {
  const $ = cheerio.load(html);

  // The standfirst is only in the JSON-LD list (the cards show title, section and day).
  const snippets = new Map<string, string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      if (data?.["@type"] !== "CollectionPage" || !Array.isArray(data.hasPart)) return;
      for (const part of data.hasPart) {
        const snippet = cleanSnippet(part?.description ?? "");
        if (typeof part?.url === "string" && snippet) snippets.set(slugOf(part.url), snippet);
      }
    } catch {
      // A malformed block only costs the standfirst.
    }
  });

  return $('article[data-testid="article-card"]')
    .map((_, el): LfcCard | null => {
      const $card = $(el);
      const slug = slugOf($card.find('a[data-testid="article-card__link"]').attr("href") ?? "");
      if (!slug) return null;
      return {
        url: storyUrl(slug),
        snippet: snippets.get(slug),
        image: thumbnailUrl($card.find('[data-testid="article-card__media"] img').attr("src")),
      };
    })
    .get()
    .filter((card): card is LfcCard => card !== null);
}

/** Sitemap stories that also sit on a kept category page, newest first. */
export function mergeLfcNews(sitemap: LfcSitemapItem[], cards: LfcCard[]): NewsArticle[] {
  const kept = new Map(cards.map((card) => [card.url, card]));
  return sitemap
    .filter((item) => kept.has(item.url))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const card = kept.get(item.url)!;
      return {
        title: item.title,
        link: item.url,
        pubDate: item.publishedAt,
        contentSnippet: card.snippet ?? "",
        thumbnail: card.image,
        source: "lfc" as NewsSource,
        language: "en" as NewsLanguage,
      };
    });
}

class HttpError extends Error {
  constructor(readonly httpStatus: number) {
    super(`HTTP ${httpStatus}`);
  }
}

// The category pages are ~570 KB, rendered per request (CDN BYPASS): 2.5-2.8s from a
// laptop, and over the old 5s from Vercel while a dozen other feeds load alongside.
const LFC_TIMEOUT_MS = 12_000;

async function getText(url: string, accept: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(LFC_TIMEOUT_MS),
      headers: { "User-Agent": NEWS_USER_AGENT, Accept: accept },
      cache: "no-store",
    });
  } catch (err) {
    // Name the page, so sync_logs says which of the three requests failed.
    const failure = new Error(`${new URL(url).pathname}: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error) failure.name = err.name;
    throw failure;
  }
  if (!res.ok) throw new HttpError(res.status);
  return res.text();
}

export class LfcAdapter implements FeedAdapter {
  readonly name = "lfc";
  status?: SourceFetchStatus;

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    try {
      const [xml, ...pages] = await Promise.all([
        getText(SITEMAP_URL, "application/xml,text/xml"),
        ...KEPT_CATEGORY_PAGES.map((url) => getText(url, "text/html,application/xhtml+xml")),
      ]);

      let sitemap: LfcSitemapItem[];
      let cards: LfcCard[];
      try {
        sitemap = parseLfcNewsSitemap(xml);
        cards = pages.flatMap(parseLfcCategoryPage);
      } catch (err) {
        this.status = statusFromError(err, "parse");
        console.warn("[lfc-adapter] parse failed:", this.status.error);
        return [];
      }
      // Zero items from a 200 means a page shape changed, not "no news".
      if (sitemap.length === 0 || cards.length === 0) {
        this.status = { state: "parse_error", error: `sitemap items: ${sitemap.length}, category cards: ${cards.length}` };
        return [];
      }
      this.status = { state: "ok" };
      return mergeLfcNews(sitemap, cards);
    } catch (err) {
      this.status = err instanceof HttpError ? { state: "http_error", httpStatus: err.httpStatus } : statusFromError(err);
      console.warn("[lfc-adapter] Failed:", err instanceof Error ? err.message : err);
      return [];
    }
  }
}
