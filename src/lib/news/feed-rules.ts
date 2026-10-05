// Per-source ingest rules for items that are not readable articles.
import type { NewsSource } from "./types";

/** Flatten rss-parser `categories` (strings or `{ _: "Name", $: {...} }`). */
export function feedCategoryNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c === "string") out.push(c);
    else if (c && typeof c === "object" && typeof (c as { _?: unknown })._ === "string") out.push((c as { _: string })._);
  }
  return out;
}

/**
 * True for items the reader cannot show as an article: Sky videos / liveblogs
 * (video page, no body) and Guardian minute-by-minute live pages.
 */
export function shouldDropFeedItem(source: NewsSource, link: string, categories: string[]): boolean {
  const url = link.toLowerCase();
  const cats = categories.map((c) => c.trim().toLowerCase());
  if (source === "sky") {
    if (cats.includes("video") || cats.includes("liveblog") || cats.includes("live blog")) return true;
    if (url.includes("/watch/video/") || url.includes("/live-blog/")) return true;
  }
  if (source === "guardian" && /\/live\/\d{4}\//.test(url)) return true;
  return false;
}
