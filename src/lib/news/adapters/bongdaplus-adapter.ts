import * as cheerio from "cheerio";
import type { FeedAdapter } from "./base";
import type { NewsArticle, NewsSource } from "../types";
import { BONGDAPLUS_URLS, LFC_KEYWORDS } from "../config";

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function isLfcRelated(title: string, href: string): boolean {
  const text = `${title} ${href}`.toLowerCase();
  return LFC_KEYWORDS.some((kw) => text.includes(kw));
}

export class BongdaplusAdapter implements FeedAdapter {
  readonly name = "bongdaplus";

  async fetch(): Promise<NewsArticle[]> {
    try {
      const articles: NewsArticle[] = [];

      const results = await Promise.allSettled(
        BONGDAPLUS_URLS.map(async (url) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0; +https://github.com)",
            },
            next: { revalidate: 1800 },
          });
          clearTimeout(timeoutId);
          if (!res.ok) return [];

          const html = await res.text();
          const $ = cheerio.load(html);
          const pageArticles: NewsArticle[] = [];

          $(".news").each((_, el) => {
            const $el = $(el);
            const $a = $el.find("a").first();
            const href = $a.attr("href") || "";
            const title = $a.attr("title") || $el.find("h3, h4").first().text().trim() || $a.text().trim();

            if (!href || !title || title.length < 10) return;
            if (!isLfcRelated(title, href)) return;

            const $img = $el.find("img");
            const thumbnail =
              $img.attr("data-src") || $img.attr("src") || $img.attr("data-original") || undefined;

            const fullLink = href.startsWith("http") ? href : `https://bongdaplus.vn${href}`;

            // Try to extract publish date from the element
            const timeEl = $el.find("time, .time, .date, span.created-date").first();
            const rawDate = timeEl.attr("datetime") || timeEl.text().trim();
            const parsed = rawDate ? new Date(rawDate) : null;
            const pubDate = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : "";

            pageArticles.push({
              title,
              link: sanitizeUrl(fullLink) ?? "#",
              pubDate,
              contentSnippet: "",
              thumbnail: sanitizeUrl(thumbnail),
              source: "bongdaplus" as NewsSource,
              language: "vi",
            });
          });

          return pageArticles;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          articles.push(...result.value);
        }
      }

      return articles.slice(0, 10);
    } catch (err) {
      console.warn(
        "[bongdaplus-adapter] Failed:",
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
