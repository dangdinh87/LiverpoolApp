import Parser from "rss-parser";
import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError } from "./base";
import type { FeedConfig, NewsArticle } from "../types";
import { LFC_KEYWORDS } from "../config";
import { matchesAnyKeyword } from "../keywords";
import { cleanFeedText, cleanSnippet } from "../text";
import { canonicalizeArticleUrl } from "../url";
import { feedCategoryNames, shouldDropFeedItem } from "../feed-rules";
import { NEWS_USER_AGENT as USER_AGENT } from "../http";
import { getValidDateMs, normalizeFeedDate } from "../date";
import { extractImageUrlFromHtml, sanitizeImageUrl } from "../image";

const FETCH_TIMEOUT_MS = 3_500;
const MAX_ITEMS_PER_FEED = 30;
const DEFAULT_MAX_AGE_DAYS = 14;

// Parser for XML string only (fetch handles HTTP — more reliable in Next.js)
const parser = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
      ["enclosure", "enclosure"],
    ],
  },
});

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function extractUrl(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const url = extractUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const attrs = obj["$"] as Record<string, unknown> | undefined;
    if (typeof attrs?.url === "string") return attrs.url;
    if (typeof obj.url === "string") return obj.url;
  }
  return undefined;
}

function extractImageFromItem(item: Record<string, unknown>, baseUrl?: string): string | undefined {
  // Prefer mediaContent/enclosure (full-size) over mediaThumbnail (often low-res)
  for (const key of ["mediaContent", "enclosure", "mediaThumbnail", "image", "itunesImage"]) {
    const image = sanitizeImageUrl(extractUrl(item[key]), baseUrl);
    if (image) return image;
  }

  // Some Vietnamese feeds (notably bongda24h.vn) put the thumbnail as an inline
  // <img> inside the RSS description/content instead of media tags.
  // extractImageUrlFromHtml covers data-original/data-src/srcset/src plus entity
  // decoding and base-URL resolution, so it supersedes hand-rolled <img> regexes.
  for (const key of ["content", "content:encoded", "description", "summary"]) {
    const image = extractImageUrlFromHtml(item[key], baseUrl);
    if (image) return image;
  }

  return undefined;
}

export class RssAdapter implements FeedAdapter {
  readonly name: string;
  status?: SourceFetchStatus;

  constructor(private config: FeedConfig) {
    this.name = config.source;
  }

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    try {
      // Use fetch() instead of rss-parser's built-in HTTP (more reliable in Next.js).
      // no-store: `revalidate: 1800` could serve a 30-minute-old copy of the feed
      // to an hourly sync (TIA / anfield-watch / bongda missed fresh items).
      const res = await fetch(this.config.url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? FETCH_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[rss-adapter] ${this.config.source}: HTTP ${res.status}`);
        this.status = { state: "http_error", httpStatus: res.status };
        return [];
      }

      const xml = await res.text();
      let feed;
      try {
        feed = await parser.parseString(xml);
      } catch (err) {
        this.status = statusFromError(err, "parse");
        console.warn(`[rss-adapter] ${this.config.source}: parse failed`, this.status.error);
        return [];
      }

      const language = this.config.language;
      const nowMs = Date.now();
      const cutoffMs = nowMs - (this.config.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 86_400_000;
      const keywords = this.config.filter
        ? this.config.filter === "lfc"
          ? LFC_KEYWORDS
          : [this.config.filter.toLowerCase()]
        : null;

      const mapped: NewsArticle[] = [];
      for (const item of feed.items) {
        const title = cleanFeedText(item.title);
        if (!title) continue;
        const itemRecord = item as unknown as Record<string, unknown>;
        // Plain text only (rss-parser already stripped tags from contentSnippet).
        const snippet = cleanSnippet(item.contentSnippet ?? item.content ?? "");

        // Keyword filter on title + snippet only, as whole words: scanning raw
        // HTML / URLs matched "leoni" in image hashes and "endo" in "tremendous".
        if (keywords && !matchesAnyKeyword(`${title} ${snippet}`, keywords)) continue;

        const rawLink = sanitizeUrl(item.link);
        const link = rawLink ? canonicalizeArticleUrl(rawLink) : "#";
        if (shouldDropFeedItem(this.config.source, link, feedCategoryNames(item.categories))) continue;
        const pubDate = normalizeFeedDate(item.pubDate ?? item.isoDate, language);
        const ms = getValidDateMs(pubDate);
        // Some feeds (vietnamnet) are unsorted and carry months-old items.
        if (ms !== null && ms < cutoffMs) continue;

        mapped.push({
          title,
          link,
          pubDate,
          contentSnippet: snippet,
          thumbnail: extractImageFromItem(itemRecord, rawLink ?? this.config.url),
          source: this.config.source,
          language,
        });
      }

      // Newest first BEFORE the cap, so a 1000-item unsorted feed keeps its fresh 30.
      mapped.sort((a, b) => (getValidDateMs(b.pubDate) ?? 0) - (getValidDateMs(a.pubDate) ?? 0));

      this.status = { state: "ok" };
      return mapped.slice(0, MAX_ITEMS_PER_FEED);
    } catch (err) {
      this.status = statusFromError(err);
      console.warn(
        `[rss-adapter] Failed ${this.config.source} (${this.config.url}):`,
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
