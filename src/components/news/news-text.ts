// Pure text helpers shared by the news list, cards and the article reader.
// No React, no server-only imports: usable from server and client components.

import { formatDayMonth } from "@/lib/format-match-date";
import { filterJunk, imageKey, isJunkParagraph } from "@/lib/news/junk";

export { filterJunk, imageKey, isJunkImage, isJunkParagraph } from "@/lib/news/junk";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  pound: "£",
  euro: "€",
};

/** Decode the HTML entities feeds leave in titles ("Salah&#8217;s", "A &amp; B"). */
export function decodeEntities(input: string | undefined | null): string {
  if (!input) return "";
  // Two passes: feeds sometimes double-encode ("&amp;#8217;").
  let out = input;
  for (let i = 0; i < 2; i++) {
    const next = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
      if (body[0] === "#") {
        const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Plain, single-line title: entities decoded, tags stripped, whitespace collapsed. */
export function cleanTitle(title: string | undefined | null): string {
  return decodeEntities(title).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Placeholder headlines extractors fall back to when a page gave no real one. */
const GENERIC_TITLE = /^(article|home|untitled|news|access denied|just a moment\.{0,3})$/i;

/**
 * The page's own headline unless it is a placeholder; then the stored listing headline.
 * `siteName` strips a trailing " - ESPN" / " | Sky Sports" that older stored rows kept.
 */
export function pickTitle(
  contentTitle: string | undefined | null,
  listedTitle: string | undefined | null,
  siteName?: string,
): string {
  let own = cleanTitle(contentTitle);
  if (siteName) {
    const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripped = own.replace(new RegExp(`\\s+[-–—|]\\s+${escaped}\\s*$`, "i"), "").trim();
    if (stripped.length >= 12) own = stripped;
  }
  if (own && !GENERIC_TITLE.test(own)) return own;
  return (listedTitle ? cleanTitle(listedTitle) : "") || own;
}

const SNIPPET_BOILERPLATE: RegExp[] = [
  /the post\b[\s\S]*?\bappeared first on\b[\s\S]*$/i,
  /\bappeared first on\b[\s\S]*$/i,
  /\bcontinue reading\b[\s\S]*$/i,
  /\bread more\b[\s\S]*$/i,
  /\bđọc tiếp\b[\s\S]*$/i,
  /\bxem thêm\b[\s\S]*$/i,
  /\[\s*(…|\.\.\.)\s*\]\s*$/,
];

/** Snippet fit for a card: no markup, no feed boilerplate, null when too thin to help. */
export function cleanSnippet(snippet: string | undefined | null, title?: string): string | null {
  if (!snippet) return null;
  let text = decodeEntities(snippet).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  for (const re of SNIPPET_BOILERPLATE) text = text.replace(re, "").trim();
  if (text.length < 40) return null;
  if (title) {
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const a = norm(text);
    const b = norm(title);
    if (a === b || a.startsWith(b)) return null;
  }
  return text;
}

const DAY_MS = 86_400_000;

/**
 * Card timestamp. Takes `nowMs` instead of reading the clock so server HTML and
 * hydrated markup agree. Older than 3 days falls back to the Vietnam-time day.
 */
export function formatNewsDate(dateStr: string, lang: "en" | "vi", nowMs: number): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diff = nowMs - date.getTime();
  const vi = lang === "vi";
  if (diff < 60_000) return vi ? "Vừa xong" : "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return vi ? `${mins} phút trước` : `${mins}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return vi ? `${hours} giờ trước` : `${hours}h ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days < 3) return vi ? `${days} ngày trước` : `${days}d ago`;
  return formatDayMonth(date, lang);
}

// ─── Reader junk filter ─────────────────────────────────────────────────────────
// The rules live in lib/news/junk.ts so the server-side HTML cleaner shares them.

export type Readability = "full" | "thin" | "linkout";

/**
 * How much of an article we can honestly show in-app.
 * linkout: nothing worth reading here, send the reader to the source.
 * thin: a short body, shown with a "read the full story" call to action.
 */
export function assessReadability(input: {
  paragraphs: string[];
  hasVideo?: boolean;
  imageCount?: number;
  flaggedThin?: boolean;
}): Readability {
  const textLen = filterJunk(input.paragraphs).reduce((n, p) => n + p.length, 0);
  const hasMedia = !!input.hasVideo || (input.imageCount ?? 0) >= 2;
  if (textLen < 120 && !hasMedia) return "linkout";
  if (textLen < 120) return "thin";
  if (input.flaggedThin || textLen < 450) return "thin";
  return "full";
}

// ─── Article HTML preparation ───────────────────────────────────────────────────

const EMBED_HOSTS = [
  "youtube.com", "youtube-nocookie.com", "youtu.be", "vimeo.com", "dailymotion.com",
];

function isEmbedSrc(src: string): boolean {
  try {
    const host = new URL(src).hostname.replace(/^www\./, "");
    return EMBED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Plain text of a tag-stripped fragment, for junk checks inside HTML. */
function textOf(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Defensive pass over already-sanitised article HTML before it is injected:
 * - removes script/style and inline event handlers
 * - `a[href]` keeps only http(s); other links lose their href, all open in a new tab
 * - images lazy-load with no referrer (hot-link protection on publisher CDNs)
 * - iframes survive only for known video hosts, wrapped in a 16:9 box
 * - paragraphs that are promo/credit lines are dropped
 */
export function prepareArticleHtml(html: string): string {
  let out = html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  out = out.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => {
    const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "").trim();
    const rest = attrs
      .replace(/\s(href|target|rel)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .trimEnd();
    if (!/^https?:\/\//i.test(href)) return `<a${rest}>`;
    return `<a${rest} href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer nofollow">`;
  });

  out = out.replace(/<img\b([^>]*?)\/?>/gi, (_m, attrs: string) => {
    const cleaned = attrs
      .replace(/\s(loading|decoding|referrerpolicy)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .trimEnd();
    return `<img${cleaned} loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
  });

  const embeds: string[] = [];
  out = out.replace(/<iframe\b([^>]*?)(?:\/>|>\s*<\/iframe>)/gi, (_m, attrs: string) => {
    const src = attrs.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i);
    const url = src?.[2] ?? src?.[3] ?? "";
    if (!/^https:\/\//i.test(url) || !isEmbedSrc(url)) return "";
    embeds.push(
      `<div class="article-embed"><iframe src="${url.replace(/"/g, "&quot;")}" title="Video" loading="lazy" referrerpolicy="no-referrer" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`,
    );
    return `@@EMBED${embeds.length - 1}@@`;
  });
  // Any iframe tag left over (unclosed or odd markup) is dropped.
  out = out.replace(/<\/?iframe\b[^>]*>/gi, "");

  out = out.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (full, inner: string) => {
    // Keep paragraphs that carry media even if their text is short.
    if (/<(img|video|iframe|figure)\b/i.test(inner)) return full;
    const text = textOf(inner);
    if (!text) return "";
    return isJunkParagraph(text) ? "" : full;
  });

  return out.replace(/@@EMBED(\d+)@@/g, (_m, i: string) => embeds[Number(i)] ?? "");
}

/** True for http(s) URLs only: the single gate for any external href we render. */
export function isHttpUrl(value: string | undefined | null): value is string {
  return !!value && /^https?:\/\//i.test(value.trim());
}

/**
 * Spread images through a run of paragraphs (one after every `every` paragraphs)
 * so a text-only body still gets visual rhythm. Leftover images go at the end.
 */
export function interleave<T, U>(paragraphs: T[], images: U[], every = 4): ({ kind: "p"; value: T } | { kind: "img"; value: U })[] {
  const out: ({ kind: "p"; value: T } | { kind: "img"; value: U })[] = [];
  let next = 0;
  paragraphs.forEach((value, i) => {
    out.push({ kind: "p", value });
    if ((i + 1) % every === 0 && next < images.length) out.push({ kind: "img", value: images[next++] });
  });
  while (next < images.length) out.push({ kind: "img", value: images[next++] });
  return out;
}


/**
 * The page already shows the hero photo above the headline; extracted bodies
 * usually start with the same photo again. Remove that first repeat (the
 * enclosing <figure> when there is one) and nothing else.
 */
export function dropHeroDuplicate(html: string, heroImage: string | undefined | null): string {
  const hero = imageKey(heroImage);
  if (!hero) return html;
  const figure = /<figure\b[^>]*>[\s\S]*?<\/figure>/i;
  const img = /<img\b[^>]*>/i;
  const srcOf = (tag: string) => tag.match(/\s(?:src|data-src)\s*=\s*["']([^"']+)["']/i)?.[1];

  const fig = html.match(figure);
  if (fig && imageKey(srcOf(fig[0] ?? "")) === hero) return html.replace(fig[0], "");
  const first = html.match(img);
  if (first && imageKey(srcOf(first[0])) === hero) return html.replace(first[0], "");
  return html;
}
