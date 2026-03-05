// Server-only: never import this in client components
import "server-only";
import { cache } from "react";
import Parser from "rss-parser";
import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NewsSource = "bbc" | "guardian" | "bongda" | "24h" | "bongdaplus";
export type NewsLanguage = "en" | "vi";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  thumbnail?: string;
  source: NewsSource;
  language: NewsLanguage;
}

export const SOURCE_CONFIG: Record<
  NewsSource,
  { label: string; color: string; language: NewsLanguage }
> = {
  bbc: {
    label: "BBC",
    color: "bg-[#BB1919]/20 text-[#FF6B6B]",
    language: "en",
  },
  guardian: {
    label: "Guardian",
    color: "bg-[#052962]/20 text-[#6B9AFF]",
    language: "en",
  },
  bongda: {
    label: "Bongda",
    color: "bg-emerald-500/20 text-emerald-400",
    language: "vi",
  },
  "24h": {
    label: "24h",
    color: "bg-orange-500/20 text-orange-400",
    language: "vi",
  },
  bongdaplus: {
    label: "BD+",
    color: "bg-sky-500/20 text-sky-400",
    language: "vi",
  },
};

// ---------------------------------------------------------------------------
// Feed Configuration
// ---------------------------------------------------------------------------

interface RssFeedConfig {
  url: string;
  source: NewsSource;
  language: NewsLanguage;
  filter?: string; // keyword filter on title (lowercase match)
}

const RSS_FEEDS: RssFeedConfig[] = [
  {
    url: "https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml",
    source: "bbc",
    language: "en",
  },
  {
    url: "https://www.theguardian.com/football/liverpool/rss",
    source: "guardian",
    language: "en",
  },
  {
    url: "https://bongda.com.vn/liverpool.rss",
    source: "bongda",
    language: "vi",
  },
  {
    url: "https://cdn.24h.com.vn/upload/rss/bongda.rss",
    source: "24h",
    language: "vi",
    filter: "liverpool",
  },
];

// ---------------------------------------------------------------------------
// RSS Parser Setup
// ---------------------------------------------------------------------------

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)",
  },
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
      ["enclosure", "enclosure"],
    ],
  },
});

// ---------------------------------------------------------------------------
// URL Sanitization
// ---------------------------------------------------------------------------

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

// ---------------------------------------------------------------------------
// Image Extraction (multi-format)
// ---------------------------------------------------------------------------

function extractImageFromItem(item: Record<string, unknown>): string | undefined {
  // 1. media:thumbnail — BBC uses this
  const thumb = item.mediaThumbnail;
  if (thumb) {
    const url = extractUrl(thumb);
    if (url) return url;
  }

  // 2. enclosure — Guardian/Sky often use this
  const enc = item.enclosure;
  if (enc) {
    const url = extractUrl(enc);
    if (url) return url;
  }

  // 3. media:content — alternative media tag
  const mc = item.mediaContent;
  if (mc) {
    const url = extractUrl(mc);
    if (url) return url;
  }

  return undefined;
}

function extractUrl(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    // { $: { url: "..." } } format
    const attrs = obj["$"] as Record<string, unknown> | undefined;
    if (typeof attrs?.url === "string") return attrs.url;
    // { url: "..." } format
    if (typeof obj.url === "string") return obj.url;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// RSS Fetch Helper
// ---------------------------------------------------------------------------

async function fetchRssFeed(config: RssFeedConfig): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);

    let items = feed.items;

    // Apply keyword filter (e.g. 24h — only keep Liverpool-related)
    if (config.filter) {
      const kw = config.filter.toLowerCase();
      items = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(kw) ||
          item.contentSnippet?.toLowerCase().includes(kw)
      );
    }

    return items.map((item) => ({
      title: item.title ?? "Untitled",
      link: sanitizeUrl(item.link) ?? "#",
      pubDate: item.pubDate ?? new Date().toISOString(),
      contentSnippet: item.contentSnippet ?? item.content ?? "",
      thumbnail: sanitizeUrl(
        extractImageFromItem(item as unknown as Record<string, unknown>)
      ),
      source: config.source,
      language: config.language,
    }));
  } catch (err) {
    console.warn(
      `[rss-parser] Failed to fetch ${config.source} (${config.url}):`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Bongdaplus Scraper
// ---------------------------------------------------------------------------

const BONGDAPLUS_URL = "https://bongdaplus.vn/liverpool";

async function scrapeBongdaplus(): Promise<NewsArticle[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(BONGDAPLUS_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)",
      },
      next: { revalidate: 1800 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[scraper] Bongdaplus returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const articles: NewsArticle[] = [];

    // Bongdaplus article list — try common selectors
    const selectors = [
      ".news-item",
      ".article-item",
      ".list-news li",
      ".news-list .item",
      ".cate-news-item",
    ];

    let $items = $(selectors[0]);
    for (const sel of selectors) {
      const $found = $(sel);
      if ($found.length > 0) {
        $items = $found;
        break;
      }
    }

    // Fallback: look for any article links with images
    if ($items.length === 0) {
      $("a[href*='/tin-']").each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        const title = $a.attr("title") || $a.text().trim();
        if (!href || !title || title.length < 10) return;

        const $img = $a.find("img");
        const thumbnail =
          $img.attr("data-src") || $img.attr("src") || undefined;

        const fullLink = href.startsWith("http")
          ? href
          : `https://bongdaplus.vn${href}`;

        articles.push({
          title,
          link: sanitizeUrl(fullLink) ?? "#",
          pubDate: new Date().toISOString(),
          contentSnippet: "",
          thumbnail: sanitizeUrl(thumbnail),
          source: "bongdaplus",
          language: "vi",
        });
      });

      return articles;
    }

    $items.each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const href = $a.attr("href");
      const title =
        $a.attr("title") || $el.find("h3, h4, .title").first().text().trim() || $a.text().trim();

      if (!href || !title || title.length < 10) return;

      const $img = $el.find("img");
      const thumbnail =
        $img.attr("data-src") || $img.attr("src") || undefined;

      const fullLink = href.startsWith("http")
        ? href
        : `https://bongdaplus.vn${href}`;

      articles.push({
        title,
        link: sanitizeUrl(fullLink) ?? "#",
        pubDate: new Date().toISOString(),
        contentSnippet: "",
        thumbnail: sanitizeUrl(thumbnail),
        source: "bongdaplus",
        language: "vi",
      });
    });

    return articles.slice(0, 15);
  } catch (err) {
    console.warn(
      "[scraper] Bongdaplus failed:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Merge, Dedup, Sort
// ---------------------------------------------------------------------------

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    // Normalize URL: strip trailing slash, protocol, www
    const key = a.link
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getNews = cache(async (limit = 20): Promise<NewsArticle[]> => {
  try {
    // Fetch all sources in parallel — graceful per-source failure
    const results = await Promise.allSettled([
      ...RSS_FEEDS.map((feed) => fetchRssFeed(feed)),
      scrapeBongdaplus(),
    ]);

    const allArticles: NewsArticle[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allArticles.push(...result.value);
      }
    }

    // If all sources failed, use mocks
    if (allArticles.length === 0) {
      return getMockNews().slice(0, limit);
    }

    // Dedup → sort by date desc → slice
    const unique = deduplicateArticles(allArticles);
    unique.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

    return unique.slice(0, limit);
  } catch (err) {
    console.error("[rss-parser] Fatal error in getNews:", err);
    return getMockNews().slice(0, limit);
  }
});

// ---------------------------------------------------------------------------
// Mock Fallback
// ---------------------------------------------------------------------------

function getMockNews(): NewsArticle[] {
  return [
    {
      title: "Liverpool extend Premier League lead with dominant display",
      link: "https://www.bbc.co.uk/sport/football/liverpool-1",
      pubDate: new Date(Date.now() - 3600000).toISOString(),
      contentSnippet:
        "Liverpool moved further clear at the top of the Premier League after a convincing victory at Anfield.",
      thumbnail: undefined,
      source: "bbc",
      language: "en",
    },
    {
      title: "Salah reaches 200 Premier League goal milestone",
      link: "https://www.bbc.co.uk/sport/football/liverpool-2",
      pubDate: new Date(Date.now() - 86400000).toISOString(),
      contentSnippet:
        "Mohamed Salah became the first African player to score 200 Premier League goals.",
      thumbnail: undefined,
      source: "guardian",
      language: "en",
    },
    {
      title:
        "Liverpool chien thang thuyet phuc truoc doi thu canh tranh",
      link: "https://bongda.com.vn/liverpool-mock-1",
      pubDate: new Date(Date.now() - 172800000).toISOString(),
      contentSnippet:
        "Liverpool da co chien thang an tuong tai vong 25 Premier League.",
      thumbnail: undefined,
      source: "bongda",
      language: "vi",
    },
    {
      title: "Van Dijk signs new long-term deal at Anfield",
      link: "https://www.bbc.co.uk/sport/football/liverpool-3",
      pubDate: new Date(Date.now() - 259200000).toISOString(),
      contentSnippet:
        "Virgil van Dijk has committed his future to Liverpool by signing an extended contract.",
      thumbnail: undefined,
      source: "bbc",
      language: "en",
    },
    {
      title:
        "Arne Slot va ke hoach chuyen nhuong he 2026 cua Liverpool",
      link: "https://cdn.24h.com.vn/tin-tuc/liverpool-mock-1",
      pubDate: new Date(Date.now() - 345600000).toISOString(),
      contentSnippet:
        "HLV Arne Slot chia se ve ke hoach bo sung luc luong mua he.",
      thumbnail: undefined,
      source: "24h",
      language: "vi",
    },
    {
      title: "Champions League last-16 preview: Liverpool's European journey continues",
      link: "https://www.bbc.co.uk/sport/football/liverpool-4",
      pubDate: new Date(Date.now() - 432000000).toISOString(),
      contentSnippet:
        "Liverpool prepare for their Champions League knockout tie with high spirits.",
      thumbnail: undefined,
      source: "guardian",
      language: "en",
    },
  ];
}
