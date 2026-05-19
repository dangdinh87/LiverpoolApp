import Parser from "rss-parser";
import type { FeedAdapter } from "./base";
import type { FeedConfig, NewsArticle } from "../types";
import { LFC_KEYWORDS } from "../config";
import { extractImageUrlFromHtml, sanitizeImageUrl } from "../image";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)";

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

  for (const key of ["content", "content:encoded", "description", "summary"]) {
    const image = extractImageUrlFromHtml(item[key], baseUrl);
    if (image) return image;
  }

  return undefined;
}

export class RssAdapter implements FeedAdapter {
  readonly name: string;

  constructor(private config: FeedConfig) {
    this.name = config.source;
  }

  async fetch(): Promise<NewsArticle[]> {
    try {
      // Use fetch() instead of rss-parser's built-in HTTP (more reliable in Next.js)
      const res = await fetch(this.config.url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 1800 },
      });

      if (!res.ok) {
        console.warn(`[rss-adapter] ${this.config.source}: HTTP ${res.status}`);
        return [];
      }

      const xml = await res.text();
      const feed = await parser.parseString(xml);
      let items = feed.items;

      // Apply keyword filter: "lfc" = multi-keyword LFC filter, otherwise single keyword
      if (this.config.filter) {
        const keywords = this.config.filter === "lfc"
          ? LFC_KEYWORDS
          : [this.config.filter.toLowerCase()];
        items = items.filter((item) => {
          const text = `${item.title ?? ""} ${item.contentSnippet ?? ""} ${item.content ?? ""}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        });
      }

      return items.map((item) => {
        const link = sanitizeUrl(item.link) ?? "#";
        const itemRecord = item as unknown as Record<string, unknown>;

        return {
          title: item.title ?? "Untitled",
          link,
          pubDate: item.pubDate ?? "",
          contentSnippet: item.contentSnippet ?? item.content ?? "",
          thumbnail: extractImageFromItem(itemRecord, link !== "#" ? link : this.config.url),
          source: this.config.source,
          language: this.config.language,
        };
      });
    } catch (err) {
      console.warn(
        `[rss-adapter] Failed ${this.config.source} (${this.config.url}):`,
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
