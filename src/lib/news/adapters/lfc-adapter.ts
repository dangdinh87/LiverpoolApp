import type { FeedAdapter } from "./base";
import type { NewsArticle, NewsSource, NewsLanguage } from "../types";

interface LfcNewsItem {
  title: string;
  url: string;
  publishedAt: string;
  kicker?: string;
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

export class LfcAdapter implements FeedAdapter {
  readonly name = "lfc";

  async fetch(): Promise<NewsArticle[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://www.liverpoolfc.com/news", {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        next: { revalidate: 1800 },
      });
      clearTimeout(timeoutId);
      if (!res.ok) return [];

      const html = await res.text();
      const match = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/
      );
      if (!match?.[1]) return [];

      const data = JSON.parse(match[1]);
      const results: LfcNewsItem[] =
        data?.props?.pageProps?.data?.newsPage?.results ?? [];

      return results.slice(0, 15).map((item) => {
        const img =
          item.coverImage?.sizes?.sm?.webpUrl ??
          item.coverImage?.sizes?.sm?.url ??
          item.coverImage?.sizes?.md?.webpUrl ??
          undefined;

        return {
          title: item.title,
          link: `https://www.liverpoolfc.com${item.url}`,
          pubDate: item.publishedAt || new Date().toISOString(),
          contentSnippet: item.kicker ?? "",
          thumbnail: sanitizeUrl(img),
          source: "lfc" as NewsSource,
          language: "en" as NewsLanguage,
        };
      });
    } catch (err) {
      console.warn(
        "[lfc-adapter] Failed:",
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
