import type { NewsArticle } from "../types";
import { extractImageUrlFromHtml } from "../image";

interface OgMeta {
  image?: string;
  publishedAt?: string;
}

function extractMetaContent(html: string, name: string): string | undefined {
  const attr = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${attr}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${attr}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const readBodyFallback = /bongda24h\.vn/i.test(url);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};

    // Stream only what is needed: the head for normal sites, plus the start of
    // the body for sources that lazy-load their primary image outside OG tags.
    const reader = res.body?.getReader();
    if (!reader) return {};

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = readBodyFallback ? 200_000 : 50_000;
    try {
      while (html.length < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (!readBodyFallback && html.includes("</head>")) break;
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    // Image: the shared helper resolves relative srcs against `url` and already
    // covers data-src/data-original/srcset plus bad-image filtering.
    // Date: extractMetaContent matches both property= and name=, single or double
    // quotes, in either attribute order — stricter inline regexes miss those.
    return {
      image: extractImageUrlFromHtml(html, url),
      publishedAt:
        extractMetaContent(html, "article:published_time") ||
        extractMetaContent(html, "pubdate") ||
        extractMetaContent(html, "date"),
    };
  } catch {
    return {};
  }
}

// Detect fake dates (set by scrapers that use `new Date()` as fallback)
export function isFakeDate(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff >= 0 && diff < 120_000;
}

export async function enrichArticleMeta(
  articles: NewsArticle[],
  maxFetches: number
): Promise<void> {
  const toEnrich = articles
    .filter((a) => (!a.thumbnail || isFakeDate(a.pubDate)) && a.link !== "#")
    .slice(0, maxFetches);

  if (toEnrich.length === 0) return;

  // Batch in chunks of 10 to avoid overwhelming servers
  const BATCH_SIZE = 10;
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((a) => fetchOgMeta(a.link))
    );

    results.forEach((result, j) => {
      if (result.status === "fulfilled") {
        const meta = result.value;
        if (meta.image && !batch[j].thumbnail) {
          batch[j].thumbnail = meta.image;
        }
        if (meta.publishedAt && isFakeDate(batch[j].pubDate)) {
          batch[j].pubDate = meta.publishedAt;
        }
      }
    });
  }
}
