import type { NewsArticle } from "@/lib/news/types";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

/** Decode HTML entities that leak into RSS titles ("Salah&#8217;s", "&amp;"). */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeChar(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function safeChar(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Title ready to render: entities decoded, tags stripped. */
export function cleanTitle(title: string): string {
  return decodeEntities(title.replace(/<[^>]*>/g, " "));
}

const BOILERPLATE = /(the post .* appeared first on|appeared first on|read more|continue reading|click here|\[…\]|\[…\]|^\s*the post\b)/i;

/**
 * Snippet worth showing, or null. RSS feeds often put "The post X appeared first
 * on Y" or a bare "Read more" in the description; those are replaced by the
 * caller with the category label.
 */
export function cleanSnippet(snippet: string | undefined, title: string): string | null {
  if (!snippet) return null;
  const text = decodeEntities(snippet.replace(/<[^>]*>/g, " "));
  if (text.length < 40) return null;
  if (BOILERPLATE.test(text)) return null;
  // Snippet that merely repeats the headline adds nothing.
  if (text.toLowerCase().startsWith(cleanTitle(title).toLowerCase().slice(0, 40))) return null;
  return text;
}

const TARGET_COUNT = 6;
const MIN_VISIBLE = 4;
const FRESH_HOURS = 48;
const STALE_HOURS = 18;
const HOUR_MS = 3_600_000;

const time = (a: NewsArticle) => new Date(a.pubDate).getTime();

/**
 * Pick the articles for the homepage: viewer-language first, topped up from the
 * other language when that feed is sparse or stale.
 *
 * Freshness is measured against the newest article held, not the wall clock, so
 * the result is a pure function of its input (stable across ISR and hydration).
 */
export function selectHomeNews(articles: NewsArticle[], lang: "vi" | "en", count = TARGET_COUNT): NewsArticle[] {
  const sortedAll = [...articles].sort((a, b) => time(b) - time(a));
  if (sortedAll.length === 0) return [];

  const nowMs = time(sortedAll[0]);
  const freshCutoff = nowMs - FRESH_HOURS * HOUR_MS;
  const freshAll = sortedAll.filter((a) => time(a) >= freshCutoff);
  const primary = sortedAll.filter((a) => a.language === lang);
  const newestPrimary = primary.length ? time(primary[0]) : 0;
  const primaryIsStale = !newestPrimary || nowMs - newestPrimary > STALE_HOURS * HOUR_MS;

  if (primaryIsStale) {
    if (freshAll.length >= MIN_VISIBLE) return freshAll.slice(0, count);
    return sortedAll.slice(0, count);
  }

  const freshPrimary = freshAll.filter((a) => a.language === lang);
  const freshSecondary = freshAll.filter((a) => a.language !== lang);
  const composed = [...freshPrimary, ...freshSecondary].slice(0, count);
  if (composed.length < MIN_VISIBLE) {
    for (const a of sortedAll) {
      if (composed.length >= count) break;
      if (!composed.some((x) => x.link === a.link)) composed.push(a);
    }
  }
  return composed;
}
