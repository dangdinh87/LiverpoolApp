import * as cheerio from "cheerio";
import type { FeedAdapter } from "./base";
import type { NewsArticle, NewsSource } from "../types";
import { VIETNAMVN_URLS, LFC_KEYWORDS } from "../config";

function isLfcRelated(title: string, href: string): boolean {
  const text = `${title} ${href}`.toLowerCase();
  return LFC_KEYWORDS.some((kw) => text.includes(kw));
}

export class VietnamvnAdapter implements FeedAdapter {
  readonly name = "vietnamvn";

  async fetch(): Promise<NewsArticle[]> {
    try {
      const articles: NewsArticle[] = [];

      const results = await Promise.allSettled(
        VIETNAMVN_URLS.map(async (url) => {
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

          // vietnam.vn uses <a class="v-link-title"> for article links
          $("a.v-link-title").each((_, el) => {
            const $a = $(el);
            const href = $a.attr("href") || "";
            const title = $a.attr("title") || $a.text().trim();

            if (!href || !title || title.length < 10) return;
            if (!isLfcRelated(title, href)) return;

            // Find thumbnail from sibling/parent img
            const $parent = $a.closest("[class*='card'], [class*='item'], [class*='post'], div");
            const $img = $parent.find("img").first();
            const thumbnail =
              $img.attr("data-src") || $img.attr("src") || undefined;

            const fullLink = href.startsWith("http") ? href : `https://www.vietnam.vn${href}`;

            pageArticles.push({
              title,
              link: fullLink,
              pubDate: "",
              contentSnippet: "",
              thumbnail: thumbnail && /^https?:\/\//i.test(thumbnail) ? thumbnail : undefined,
              source: "vietnamvn" as NewsSource,
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
        "[vietnamvn-adapter] Failed:",
        err instanceof Error ? err.message : err
      );
      return [];
    }
  }
}
