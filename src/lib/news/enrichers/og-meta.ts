import type { NewsArticle } from "../types";

export function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

interface OgMeta {
  image?: string;
  publishedAt?: string;
}

export async function fetchOgMeta(url: string): Promise<OgMeta> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)",
        Accept: "text/html",
        "Accept-Encoding": "gzip, deflate",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};

    // Use res.text() which auto-decompresses gzip/brotli, then truncate
    const full = await res.text();
    const headEnd = full.indexOf("</head>");
    const html = headEnd > 0 ? full.slice(0, headEnd + 7) : full.slice(0, 50000);

    const imgMatch =
      html.match(/property="og:image"[^>]*content="([^"]+)"/) ||
      html.match(/content="([^"]+)"[^>]*property="og:image"/);

    const dateMatch =
      html.match(/property="article:published_time"[^>]*content="([^"]+)"/) ||
      html.match(/content="([^"]+)"[^>]*property="article:published_time"/) ||
      html.match(/name="pubdate"[^>]*content="([^"]+)"/) ||
      html.match(/name="date"[^>]*content="([^"]+)"/);

    return {
      image: sanitizeUrl(imgMatch?.[1]),
      publishedAt: dateMatch?.[1],
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
