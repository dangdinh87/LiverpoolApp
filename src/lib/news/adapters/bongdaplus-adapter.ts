import * as cheerio from "cheerio";
import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError, worseStatus } from "./base";
import type { NewsArticle, NewsSource } from "../types";
import { BONGDAPLUS_URLS, LFC_KEYWORDS } from "../config";
import { NEWS_USER_AGENT } from "../http";
import { matchesAnyKeyword } from "../keywords";
import { cleanFeedText } from "../text";
import { canonicalizeArticleUrl } from "../url";
import { sanitizeImageUrl } from "../image";
import { normalizeFeedDate, parseFeedDateMs, parseVietnameseDateText } from "../date";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_ITEMS = 20;
const MAX_AGE_MS = 14 * 86_400_000;

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function isLfcRelated(title: string, href: string): boolean {
  // Whole words in title + slug ("liverpool" inside "liverpool-thang-lon" counts).
  return matchesAnyKeyword(`${title} ${href.replace(/[-_/.]+/g, " ")}`, LFC_KEYWORDS);
}

/**
 * Date text is trusted only when it looks like a date: absolute ("18:20 ngày
 * 03/10/2026") or relative ("15 giờ trước"). The first `.info span` is often the
 * comment counter (`span.comm-lnk` = "1"), which used to be parsed as the year 2001.
 */
export function parseListDateText(text: string, nowMs: number = Date.now()): number | null {
  const t = text.trim();
  if (!t || !/ngày|trước/i.test(t)) return null;
  return parseVietnameseDateText(t, nowMs) ?? parseFeedDateMs(t, 7 * 60);
}

/**
 * Article ids end in YYMM of the publish month (…-5242802610.html = Oct 2026).
 * Used to drop undated list items whose whole month is already past retention.
 */
export function monthEndMsFromBongdaplusUrl(href: string): number | null {
  const m = /-\d*?(\d{2})(\d{2})\.html?(?:$|[?#])/.exec(href);
  if (!m) return null;
  const year = 2000 + +m[1];
  const month = +m[2];
  if (month < 1 || month > 12) return null;
  return Date.UTC(year, month, 1) - 7 * 3_600_000; // first instant of the next month, VN time
}

export function parseBongdaplusList(html: string, nowMs: number = Date.now()): NewsArticle[] {
  const $ = cheerio.load(html);
  const out: NewsArticle[] = [];
  const seen = new Set<string>();

  $(".news").each((_, el) => {
    const $el = $(el);
    // Comment counters live inside the item (sometimes inside the title link):
    // drop them before any text is read.
    $el.find("span.comm-lnk, .comm-lnk").remove();

    const $img = $el.find("img").first();
    const $titleLink = $el.find("a.title").first();
    const $textLink = $el
      .find("a")
      .filter((_, a) => !$(a).hasClass("thumb") && !$(a).hasClass("cap") && $(a).text().trim().length > 0)
      .first();
    const $a = $titleLink.length ? $titleLink : $textLink.length ? $textLink : $el.find("a").first();
    const href = $a.attr("href") || $el.find("a").first().attr("href") || "";
    const title = cleanFeedText(
      $titleLink.text() ||
        $textLink.text() ||
        $el.find("h3, h4").first().text() ||
        $a.attr("title") ||
        $img.attr("alt") ||
        ""
    );

    if (!href || !title || title.length < 10) return;
    if (!isLfcRelated(title, href)) return;

    const fullLink = canonicalizeArticleUrl(href.startsWith("http") ? href : `https://bongdaplus.vn${href}`);
    // The home-slide and the list repeat the same story.
    if (seen.has(fullLink)) return;

    const thumbnail = sanitizeImageUrl(
      $img.attr("data-src") || $img.attr("src") || $img.attr("data-original"),
      "https://bongdaplus.vn"
    );

    // Date: <time datetime>, or an `.info span` whose text is a real date.
    let dateMs: number | null = null;
    const timeEl = $el.find("time").first();
    if (timeEl.length) {
      const text = timeEl.attr("datetime") || timeEl.text().trim();
      dateMs = parseListDateText(text, nowMs) ?? parseFeedDateMs(text, 7 * 60);
    }
    if (dateMs === null) {
      $el.find(".info span").each((_, s) => {
        if (dateMs !== null) return;
        dateMs = parseListDateText($(s).text(), nowMs);
      });
    }

    if (dateMs !== null) {
      if (nowMs - dateMs > MAX_AGE_MS) return;
    } else {
      // Undated: keep only when the id's month is still inside the retention window.
      const monthEnd = monthEndMsFromBongdaplusUrl(fullLink);
      if (monthEnd !== null && nowMs - monthEnd > MAX_AGE_MS) return;
    }

    seen.add(fullLink);
    out.push({
      title,
      link: sanitizeUrl(fullLink) ?? "#",
      pubDate: dateMs !== null ? normalizeFeedDate(dateMs, "vi") : "",
      contentSnippet: "",
      thumbnail,
      source: "bongdaplus" as NewsSource,
      language: "vi",
    });
  });

  return out;
}

export class BongdaplusAdapter implements FeedAdapter {
  readonly name = "bongdaplus";
  status?: SourceFetchStatus;

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    const articles: NewsArticle[] = [];
    const seen = new Set<string>();
    let status: SourceFetchStatus | undefined;

    const results = await Promise.allSettled(
      BONGDAPLUS_URLS.map(async (url) => {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { "User-Agent": NEWS_USER_AGENT },
          cache: "no-store",
        });
        if (!res.ok) {
          console.warn(`[bongdaplus-adapter] ${url}: HTTP ${res.status}`);
          return { items: [] as NewsArticle[], status: { state: "http_error", httpStatus: res.status } as SourceFetchStatus };
        }
        return { items: parseBongdaplusList(await res.text()), status: { state: "ok" } as SourceFetchStatus };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        status = worseStatus(status, result.value.status);
        for (const item of result.value.items) {
          if (seen.has(item.link)) continue;
          seen.add(item.link);
          articles.push(item);
        }
      } else {
        console.warn("[bongdaplus-adapter] Failed:", result.reason instanceof Error ? result.reason.message : result.reason);
        status = worseStatus(status, statusFromError(result.reason));
      }
    }

    // Newest first (undated last) so the cap keeps the fresh ones.
    const ms = (a: NewsArticle) => (a.pubDate ? new Date(a.pubDate).getTime() : 0);
    articles.sort((a, b) => ms(b) - ms(a));
    this.status = status ?? { state: "ok" };
    return articles.slice(0, MAX_ITEMS);
  }
}
