/**
 * Extractor Selector Reference (LFC/EOTK/Echo re-verified 2026-10-04)
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Source               │ Container Selectors (priority order)             │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ liverpoolfc.com      │ __NEXT_DATA__ newsArticle.blocks → main         │
 * │ bbc.com              │ [data-component=text-block] → article, main     │
 * │ theguardian.com      │ article                                          │
 * │ empireofthekop.com   │ #article-body → .entry-content → article        │
 * │ anfieldwatch.co.uk   │ .main__article → .basic-text                    │
 * │ liverpoolecho.co.uk  │ article#article-body → article                  │
 * │ bongda.com.vn        │ section.contentDetail → article                 │
 * │ 24h.com.vn           │ article → .detail-content → .cms-body          │
 * │ bongdaplus.vn        │ .news-detail → .detail-body → .content-news    │
 * │ vnexpress.net        │ .fck_detail → .article-content                  │
 * │ znews.vn             │ .the-article-body → .article-content            │
 * │ vietnam.vn           │ .post-detail-body → .post-detail-container      │
 * │ dantri.com.vn        │ article → .singular-content                     │
 * │ tuoitre.vn           │ .detail-cmain → .detail-content                 │
 * │ thanhnien.vn         │ .detail-content → .detail__content              │
 * │ vietnamnet.vn        │ .maincontent → .content-detail                  │
 * │ webthethao.vn        │ #abody.shortcode-content.ck-content             │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 */
import "server-only";
import { cache } from "react";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ArticleContent } from "../types";
import sanitize from "sanitize-html";
import {
  extractWithReadability,
  estimateReadingTime,
  sanitizeText,
} from "./readability";
import { detectSource, isLinkOutOnlyUrl } from "../source-detect";
import { NEWS_USER_AGENT } from "../http";
import { getServiceClient } from "../supabase-service";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { looksLikeJunkContent } from "../content-quality";
import { cleanArticleContent } from "../article-clean";
import { articleUrlVariants } from "../url";
import { parseFeedDateMs } from "../date";
import { cleanFeedText, stripSnippetBoilerplate } from "../text";

// --- Content cache helpers (DB-level, survives serverless cold starts) ---

const CONTENT_CACHE_TTL_MS = 24 * 3600 * 1000; // 24 hours

async function getCachedContent(url: string): Promise<ArticleContent | null> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("articles")
      .select("content_en, content_scraped_at")
      .in("url", articleUrlVariants(url))
      .order("content_scraped_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!data?.content_en) return null;

    const scrapedAt = new Date(data.content_scraped_at).getTime();
    if (Date.now() - scrapedAt > CONTENT_CACHE_TTL_MS) return null;

    const content = data.content_en as ArticleContent;
    // A stored page shell (menus + every image) is not an article: scrape again.
    // Anything else stored by an older extractor is cleaned the same way new scrapes are.
    return looksLikeJunkContent(content) ? null : cleanArticleContent(content);
  } catch {
    return null;
  }
}

async function cacheContent(url: string, content: ArticleContent): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase
      .from("articles")
      .update({ content_en: content, content_scraped_at: new Date().toISOString() })
      .in("url", articleUrlVariants(url));
  } catch (err) {
    console.error("[article-extractor] Cache write failed:", err);
  }
}

const ARTICLE_SANITIZE_OPTS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat([
    "img", "iframe", "video", "source"
  ]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    div: ["class", "data-video-src", "data-poster", "data-source-url", "data-source-name", "type", "data-type"],
    figure: ["class"],
    span: ["class"],
    table: ["class", "border", "cellpadding", "cellspacing"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "allow"],
    video: ["controls", "width", "height", "poster", "autoplay", "loop", "muted"],
    source: ["src", "type"],
    p: ["class"],
  },
  allowedSchemes: ["https", "http"],
  exclusiveFilter: (frame) => {
    // Drop known ad or junk classes
    if (frame.tag === "div" && frame.attribs.class) {
      const cls = frame.attribs.class.toLowerCase();
      if (cls.includes("vcsortableinpreviewmode")) {
        return false;
      }
      if (cls.includes("ads-wrapper") || cls.includes("ads-adv_teads_video") || cls.includes("ads-adv_pc_in_article")) {
        return true;
      }
    }
    return false;
  }
};

type Extractor = ($: cheerio.CheerioAPI, url: string) => ArticleContent;

// --- Common helpers ---

/** O(1) dedup helper — replaces O(n) array.includes() checks */
function pushUnique(arr: string[], seen: Set<string>, value: string) {
  if (!seen.has(value)) { seen.add(value); arr.push(value); }
}

/**
 * Pick a container by trying each selector in the order it was written.
 *
 * `$("a, b").first()` returns the first match in *document* order, so a broad
 * fallback like `article` that wraps the whole page wins over the precise
 * `.maincontent` it was meant to back up — dragging the headline, share bar,
 * publish date and ad slots into the extracted body. Selector lists here are
 * authored most-specific-first, so honour that order instead.
 */
function selectContainer(
  $: cheerio.CheerioAPI,
  selectors: string
): cheerio.Cheerio<AnyNode> {
  for (const selector of selectors.split(",")) {
    const match = $(selector.trim()).first();
    if (match.length > 0) return match;
  }
  return $();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** "(Dân trí) - Fulham gây tranh cãi…" -> "Fulham gây tranh cãi…" (VN dateline prefix). */
function stripSourcePrefix(text: string): string;
function stripSourcePrefix(text: string | undefined): string | undefined;
function stripSourcePrefix(text: string | undefined): string | undefined {
  return text?.replace(/^\s*\((?:[^()]{2,24})\)\s*[-–]\s*/, "").trim();
}

/** Compare two blocks of prose ignoring case, punctuation and whitespace noise. */
function isSameText(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return norm(a) === norm(b);
}

/** Hosts whose iframes are real video players worth keeping in the article body. */
const VIDEO_EMBED_HOSTS = [
  "youtube.com", "youtube-nocookie.com", "youtu.be",
  "vimeo.com", "dailymotion.com", "facebook.com", "tiktok.com",
];

/** Whether an iframe src points at a video player rather than a site widget. */
function isVideoEmbedUrl(src: string | undefined): boolean {
  if (!src) return false;
  try {
    const host = new URL(src, "https://example.invalid").hostname.replace(/^www\./, "");
    return VIDEO_EMBED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Resolve actual image URL, preferring data-original/data-src over placeholder src */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveImageSrc($el: cheerio.Cheerio<any>, baseUrl?: string): string | undefined {
  const tryResolve = (val: string | undefined): string | undefined => {
    if (!val || val.startsWith("data:image")) return undefined;
    if (val.startsWith("http")) return val;
    if (baseUrl) {
      try {
        return new URL(val, baseUrl).toString();
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const dataOriginal = tryResolve($el.attr("data-original"));
  if (dataOriginal) return dataOriginal;

  const dataSrc = tryResolve($el.attr("data-src"));
  if (dataSrc) return dataSrc;

  // Handling for srcset from picture/source tags that is sometimes set as data-srcset
  const dataSrcset = $el.attr("data-srcset") || $el.attr("srcset");
  if (dataSrcset) {
    const parts = dataSrcset.split(",");
    const highestRes = parts[parts.length - 1].trim().split(" ")[0];
    const resolvedHighestRes = tryResolve(highestRes);
    if (resolvedHighestRes) return resolvedHighestRes;
  }

  const src = tryResolve($el.attr("src"));
  if (src) return src;

  return undefined;
}


/**
 * Every `a[href]` absolute against the article URL; fragment-only and `javascript:`
 * links (dead in our reader) are unwrapped to plain text.
 */
function absolutizeLinks(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<AnyNode>,
  baseUrl: string
): void {
  root.find("a[href]").each((_, el) => {
    const $a = $(el);
    const href = ($a.attr("href") ?? "").trim();
    if (/^(mailto|tel):/i.test(href)) return;
    if (!href || href.startsWith("#") || /^javascript:/i.test(href)) {
      $a.replaceWith($a.contents());
      return;
    }
    try {
      const u = new URL(href, baseUrl);
      if (u.protocol === "http:" || u.protocol === "https:") $a.attr("href", u.toString());
      else $a.replaceWith($a.contents());
    } catch {
      $a.replaceWith($a.contents());
    }
  });
}

/**
 * Centralized helper to build high-fidelity HTML content from a Cheerio container.
 * - Resolves lazy-loaded images to their true sources.
 * - Flattens malformed nested <figure><figcaption> structures (e.g. from bongda.com.vn).
 * - Sanitizes using ARTICLE_SANITIZE_OPTS.
 */
function buildHtmlContent(
  container: cheerio.Cheerio<AnyNode>,
  $: cheerio.CheerioAPI,
  baseUrl?: string
): string | undefined {
  if (!container || container.length === 0) return undefined;

  // Unconditionally remove related news elements and tags
  container.find(
    "[type='RelatedOneNews'], [type='RelatedNewsBox'], .related-news, .relate-container, .detail__related, .social-top, .detail-author, .box-comment, .the-article-link, .article-socal, .the-article-author, .the-article-tags, .pswp"
  ).remove();

  // Source page chrome that duplicates what our own article layout already renders:
  // the headline/date/"follow us" strip and the byline + "original link / copy link" card.
  // These are DIVs (not <header>/<footer>), so no tag-level rule catches them.
  container.find(
    ".the-article-header, .the-article-credit, .article-detail-author, .article-detail-author-wrapper, .article-detail-tag, .newsdetail-author, .author-info, .vnn-share-social, .share-social, .publish-date, .banner-advertisement"
  ).remove();

  // The article layout prints its own headline above the body, so a leftover
  // <h1> from the source page shows the title twice — and so does a heading that
  // merely repeats it as the first block (bongda24h opens its body with the title as h2).
  const pageTitle = $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content")?.trim() || "";
  container.find("h1").remove();
  if (pageTitle) {
    const $first = container.children().first();
    if ($first.is("h2, h3, h4") && isSameText($first.text(), pageTitle)) $first.remove();
  }

  // Hidden / template junk: CSS-hidden blocks, the CMS "related news" insert,
  // tuoitre's "Đọc tiếp / Về trang Chủ đề" box and minigame embeds. 24h marks the
  // minigame with a CLASS (`.data-embed-code-minigame`), not an attribute.
  container.find(
    ".hide, .hidden, .d-none, [hidden], [style*='display:none'], [style*='display: none'], .ck-cms-insert-neww-group, .readmore-body-box, .data-embed-code-minigame, [data-embed-code-minigame], [class*='minigame']"
  ).remove();
  container.find("a").each((_, el) => {
    if (/^(Đọc tiếp|Về trang Chủ đề)$/i.test($(el).text().replace(/\s+/g, " ").trim())) $(el).remove();
  });
  // FPT Play promo ("FPT Play mang Ngoại Hạng Anh đến mọi nhà…") — a <p> or a table cell.
  container.find("p, td, li, div").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 400 && /^FPT Play mang/i.test(text)) {
      const $el = $(el);
      if ($el.is("td")) $el.closest("table").remove();
      else $el.remove();
    }
  });

  // Video: a <video> without a playable source is a dead box; the rest becomes the
  // `.article-video-player` placeholder the reader renders (MP4 or HLS).
  const sourceName = baseUrl ? detectSource(baseUrl).name : "";
  const absolute = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    try {
      const u = new URL(value, baseUrl);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
    } catch {
      return undefined;
    }
  };
  container.find("video").each((_, el) => {
    const $v = $(el);
    const src = absolute(
      $v.attr("src") || $v.attr("data-src") || $v.find("source[src]").first().attr("src") || $v.find("source[data-src]").first().attr("data-src")
    );
    if (!src) {
      $v.remove();
      return;
    }
    const poster = absolute($v.attr("poster") || $v.attr("data-poster"));
    const $player = $("<div class='article-video-player'></div>");
    $player.attr("data-video-src", src);
    if (poster) $player.attr("data-poster", poster);
    if (baseUrl) $player.attr("data-source-url", baseUrl);
    if (sourceName) $player.attr("data-source-name", sourceName);
    $v.replaceWith($player);
  });
  // Standalone HLS/MP4 <source> outside a <video> wrapper is not renderable either.
  container.find("source").each((_, el) => {
    if ($(el).closest("picture, video").length === 0) $(el).remove();
  });

  // Every link absolute against the article URL: a relative href would resolve
  // against OUR domain in the reader and land on a 404.
  if (baseUrl) absolutizeLinks($, container, baseUrl);

  // Drop embedded widgets that are not video players (match-score boxes, polls,
  // newsletter forms). They ship their own light-theme styling and render as a
  // white slab inside the Dark Stadium layout. Video embeds are kept.
  container.find("iframe").each((_, el) => {
    const $el = $(el);
    if (!isVideoEmbedUrl($el.attr("src"))) $el.remove();
  });

  // Drop link-only lists — the inline "related articles" widgets that VN sources
  // splice into the body as a bare <ul><li><a>…</a></li></ul> with no class to
  // target. A list whose every item is nothing but a link is never prose.
  container.find("ul, ol").each((_, el) => {
    const $list = $(el);
    const $items = $list.children("li");
    if ($items.length === 0) return;
    const allLinkOnly = $items.toArray().every((li) => {
      const $li = $(li);
      const linkText = $li.find("a").text().trim();
      return linkText.length > 0 && $li.text().trim() === linkText;
    });
    if (allLinkOnly) $list.remove();
  });

  // 1. Resolve lazy-loaded images to their true source before unwrapping picture tags
  // This allows us to inspect <source> siblings within a <picture> for higher-quality srcset.
  container.find("img").each((_, el) => {
    const $el = $(el);

    // First, look for a sibling <source> tag with a data-srcset or srcset if we are in a <picture>
    const $parentPicture = $el.closest("picture");
    let realSrc = undefined;

    if ($parentPicture.length > 0) {
      const $source = $parentPicture.find("source").first();
      if ($source.length > 0) {
        realSrc = resolveImageSrc($source, baseUrl);
      }
    }

    // Fallback to the img tag itself if we didn't find anything from the picture source
    if (!realSrc) {
      realSrc = resolveImageSrc($el, baseUrl);
    }

    // Another fallback: check if there's a meta itemprop="url" sibling (e.g. vnexpress)
    if (!realSrc) {
      const $parentFigure = $el.closest("figure");
      if ($parentFigure.length > 0) {
        const metaUrl = $parentFigure.find("meta[itemprop='url']").attr("content");
        if (metaUrl && metaUrl.startsWith("http")) {
          realSrc = metaUrl;
        }
      }
    }

    if (realSrc) {
      $el.attr("src", realSrc);
      $el.removeAttr("data-src");
      $el.removeAttr("data-original");
      $el.attr("loading", "lazy");
    }
  });

  // Unwrap <picture> tags to just their <img> child to ensure proper styling
  // and prevent sanitize-html from breaking them (since <picture> and <source>
  // aren't fully supported without extra config, and we just need the <img>).
  container.find("picture").each((_, el) => {
    const $el = $(el);
    const $img = $el.find("img").first();
    if ($img.length > 0) {
      $el.replaceWith($img);
    }
  });

  // Normalize nested tables with images (like ZNews) into standard figure > img
  container.find("table.picture, table").each((_, el) => {
    const $tbl = $(el);
    if ($tbl.find("img").length > 0) {
      const $img = $tbl.find("img").first();
      const $caption = $tbl.find("p, figcaption, em, td.caption, .caption").not($img.parent()).first();
      const figure = $("<figure></figure>");
      figure.append($img.clone());
      if ($caption.length > 0 && $caption.text().trim().length > 0) {
        figure.append($("<figcaption></figcaption>").text($caption.text().trim()));
      }
      $tbl.replaceWith(figure);
    }
  });

  // 2. Sanitize HTML
  const rawHtml = container.html() || "";
  let sanitized = sanitize(rawHtml, ARTICLE_SANITIZE_OPTS);

  // 3. Post-process to fix malformed nested figures (often seen in VN sites)
  if (sanitized.includes("<figcaption>") && sanitized.includes("<figure>")) {
    const $html = cheerio.load(sanitized, null, false);
    $html("figcaption figure").each((_, el) => {
      const $fig = $html(el);
      $fig.insertAfter($fig.closest("figure"));
    });
    // Remove empty/orphaned closing tags left over
    sanitized = $html.html()?.replace(/<\/(figcaption|figure)>\s*<\/(figcaption|figure)>\s*/g, "</$1>\n</$2>\n") || sanitized;
  }

  // Final cleanup of unwrapped images into figures if they contain alt text
  const $final = cheerio.load(sanitized, null, false);
  $final("div > img:only-child").each((_, el) => {
    const $el = $final(el);
    const $div = $el.parent();
    const figure = $final("<figure></figure>");
    figure.append($el.clone());
    $div.replaceWith(figure);
  });

  sanitized = $final.html() || sanitized;

  return sanitized || undefined;
}

/** Every JSON-LD object on the page (flattening arrays and `@graph`). */
function readJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    out.push(node as Record<string, unknown>);
    visit((node as Record<string, unknown>)["@graph"]);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).contents().text()));
    } catch { /* ignore malformed JSON-LD */ }
  });
  return out;
}

/** Raw date text → ISO. Zone-less strings are read as Vietnam time (+07:00), not the server zone. */
function toIsoDate(raw: unknown): string | undefined {
  const ms = parseFeedDateMs(raw, 7 * 60);
  return ms === null ? undefined : new Date(ms).toISOString();
}

function cleanAuthorName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = cleanFeedText(raw).replace(/^by\s+/i, "").trim();
  if (text.length < 2 || text.length > 80 || /^https?:\/\//i.test(text)) return undefined;
  return text;
}

function authorFromJsonLd(value: unknown): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    for (const v of value) {
      const name = authorFromJsonLd(v);
      if (name) return name;
    }
    return undefined;
  }
  if (typeof value === "string") return cleanAuthorName(value);
  if (typeof value === "object") return cleanAuthorName((value as { name?: unknown }).name);
  return undefined;
}

function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  // `article:author` is often a profile URL (Facebook, site author page): a URL is
  // not a name, so move on to the next candidate instead of giving up.
  // bongdaplus has two `author` metas, the first a Facebook URL: check them all.
  const candidates: unknown[] = [];
  $('meta[name="author"], meta[property="author"], meta[property="article:author"], meta[name="byl"]').each((_, el) => {
    candidates.push($(el).attr("content"));
  });
  for (const c of candidates) {
    const name = cleanAuthorName(c);
    if (name) return name;
  }
  for (const node of readJsonLd($)) {
    const name = authorFromJsonLd(node.author);
    if (name) return name;
  }
  return (
    cleanAuthorName($('[rel="author"]').first().text()) ||
    cleanAuthorName($('[class*="author"]').first().text()) ||
    undefined
  );
}

function extractPublishedAt($: cheerio.CheerioAPI): string | undefined {
  const candidates: unknown[] = [
    $('meta[property="article:published_time"]').attr("content"),
    $('meta[name="article:published_time"]').attr("content"),
    $('meta[property="og:article:published_time"]').attr("content"),
    $('meta[name="pubdate"]').attr("content"),
    $('meta[name="date"]').attr("content"),
    $('meta[itemprop="datePublished"]').attr("content"),
  ];
  for (const node of readJsonLd($)) candidates.push(node.datePublished);
  candidates.push($("time[datetime]").first().attr("datetime"));
  for (const c of candidates) {
    const iso = toIsoDate(c);
    if (iso) return iso;
  }
  return undefined;
}

// detectSourceName removed — use detectSource(url).name from source-detect.ts

// --- Per-site extractors (cheerio fallbacks) ---

const extractors: Record<string, Extractor> = {
  "liverpoolfc.com": extractLfcOfficial,
  "bbc.com": extractBBC,
  "bbc.co.uk": extractBBC,
  "theguardian.com": extractGuardian,
  "bongda.com.vn": extractBongda,
  "24h.com.vn": extract24h,
  "bongdaplus.vn": extractBongdaplus,
  "anfieldwatch.co.uk": extractAnfieldWatch,
  "liverpoolecho.co.uk": extractLiverpoolEcho,
  // Same Reach CMS as the Echo (verified clean offline on real pages).
  "mirror.co.uk": extractLiverpoolEcho,
  "manchestereveningnews.co.uk": extractLiverpoolEcho,
  "liverpool.com": extractLiverpoolEcho,
  "empireofthekop.com": extractWordPress,
  "znews.vn": extractZnews,
  "zingnews.vn": extractZnews, // feed links are mostly on lifestyle.zingnews.vn
  "vnexpress.net": extractVnexpress,
  "dantri.com.vn": extractDantri,
  "vietnamnet.vn": extractVietnamnet,
  "tuoitre.vn": extractTuoitre,
  "thanhnien.vn": extractThanhnien,
  "webthethao.vn": extractWebthethao,
  "vietnam.vn": extractVietnamvn,
  "bongda24h.vn": extractBongda24h,
  "thethao247.vn": extractThethao247,
  "soha.vn": extractSoha,
};

function extractLfcOfficial(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const ogTitle = $('meta[property="og:title"]')
    .attr("content")
    ?.replace(/\s*[-|]\s*Liverpool FC$/i, "");
  const h1 = $("h1").first().clone();
  h1.find("style, script").remove();
  const title = ogTitle || h1.text().trim() || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const nextDataScript = $("#__NEXT_DATA__").html();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  let publishedAtLfc: string | undefined;
  let authorLfc: string | undefined;
  if (nextDataScript) {
    try {
      const pageProps = JSON.parse(nextDataScript)?.props?.pageProps;
      // The page has no article:published_time meta; the data blob does.
      publishedAtLfc = toIsoDate(pageProps?.newsArticle?.publishedAt);
      const authors = pageProps?.newsArticle?.authors;
      authorLfc = authorFromJsonLd(
        Array.isArray(authors) ? authors.map((a: unknown) => (typeof a === "string" ? a : (a as { name?: string; fullName?: string })?.name ?? (a as { fullName?: string })?.fullName)) : authors
      ) ?? (/^by\s+/i.test(pageProps?.newsArticle?.metaDescription ?? "") ? cleanAuthorName(pageProps.newsArticle.metaDescription) : undefined);
      // Current shape: pageProps.newsArticle.blocks (formattedText HTML + image blocks).
      const blocks = pageProps?.newsArticle?.blocks;
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          if (block?.type === "formattedText" && typeof block.formattedText === "string") {
            const $frag = cheerio.load(`<div id="lfc-blocks">${block.formattedText}</div>`);
            $frag("#lfc-blocks").find("p, h2, h3, h4, li").each((_, el) => {
              const text = $frag(el).text().trim();
              if (text.length > 20) pushUnique(paragraphs, seenP, text);
            });
          } else if (block?.type === "image") {
            const sizes = block.image?.sizes;
            const img = sizes?.lg?.url ?? sizes?.xl?.url ?? sizes?.md?.url ?? sizes?.sm?.url ?? sizes?.xs?.url;
            if (typeof img === "string" && img) pushUnique(images, seenI, img);
          }
        }
      }
      // Legacy shape (pre-2026): pageProps.data.article.body
      const legacyBody = pageProps?.data?.article?.body;
      if (paragraphs.length === 0 && Array.isArray(legacyBody)) {
        for (const block of legacyBody) {
          if (block.type === "paragraph" && typeof block.value === "string") {
            const text = block.value.replace(/<[^>]+>/g, "").trim();
            if (text.length > 20) pushUnique(paragraphs, seenP, text);
          } else if (block.type === "image" && block.value?.url) {
            pushUnique(images, seenI, block.value.url);
          }
        }
      }
    } catch {
      // Fall through to cheerio
    }
  }

  const container = $(
    "article, .article-body, [data-testid='article-body'], main"
  ).first();

  if (paragraphs.length === 0) {
    container.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) pushUnique(paragraphs, seenP, text);
    });
  }

  const htmlContent = buildHtmlContent(container, $, url) || undefined;

  return {
    title,
    heroImage,
    description,
    publishedAt: publishedAtLfc ?? extractPublishedAt($),
    author: authorLfc ?? extractAuthor($),
    paragraphs,
    htmlContent,
    images,
    sourceUrl: url,
    sourceName: "LiverpoolFC.com",
  };
}

function extractBBC($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = selectContainer($, "article, #main-content, [role=main], main");
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Body only: `article [data-testid=rich-text] p` + the `h2` sub-headlines. A bare
  // `article p` also matched the hero <figcaption> ("Image caption, …") and became the
  // lead paragraph; captions, bylines, topic lists and promo lists are not prose.
  const body = container.clone();
  body.find(
    "figure, figcaption, [data-block='byline'], [data-block='metadata'], [data-block='topicList'], [data-block='promoList'], [data-block='headline'], [data-block='image'], [data-block='links'], [data-component='links-block']"
  ).remove();

  const readBlocks = (root: cheerio.Cheerio<AnyNode>) => {
    root.find("[data-testid='rich-text'] p, [data-block='subheadline'] h2, [data-component='subheadline-block'] h2").each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const isHeading = el.tagName === "h2";
      if (text.length <= (isHeading ? 5 : 20)) return;
      // A paragraph that is nothing but a link is a "Read more" / related teaser.
      const linkText = $el.find("a").text().trim();
      if (linkText.length > 0 && linkText === text) return;
      if (/^(Image (?:source|caption)|Related topics|More on this story)/i.test(text)) return;
      pushUnique(paragraphs, seenP, text);
    });
  };
  readBlocks(body);

  // Older / non-standard BBC layouts: the text-block component.
  if (paragraphs.length === 0) {
    body.find("[data-component='text-block'] p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) pushUnique(paragraphs, seenP, text);
    });
  }

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("placeholder") && !src.includes("logo")) {
      pushUnique(images, seenI, src);
    }
  });

  // htmlContent from the same blocks, in document order.
  const html = $("<div></div>");
  body.find("[data-testid='rich-text'], [data-block='subheadline'] h2, [data-component='subheadline-block'] h2").each((_, el) => {
    html.append($(el).clone());
  });
  const htmlContent = html.children().length ? buildHtmlContent(html, $, url) || undefined : undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "BBC Sport",
  };
}

function extractGuardian($: cheerio.CheerioAPI, url: string): ArticleContent {
  // Live pages have no <h1>: fall back to the og:title.
  const title = $("h1").first().text().trim() ||
    cleanFeedText($('meta[property="og:title"]').attr("content")) || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // `#maincontent` is the article region; `aside` holds the newsletter promo
  // ("Sign up to Football Daily"), `figure` the captions.
  const container = selectContainer($, "#maincontent, article");
  const clean = container.clone();
  clean.find("aside, figure, gu-island:has(aside), [data-print-layout='hide']").remove();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  clean.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img[src*='guim']").each((_, el) => {
    const src = $(el).attr("src");
    if (src) pushUnique(images, seenI, src);
  });

  // Build htmlContent for rich figure/img/figcaption layout — figures stay, promos go.
  const rich = container.clone();
  rich.find("aside, gu-island:has(aside), [data-print-layout='hide']").remove();
  const htmlContent = buildHtmlContent(rich, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "The Guardian",
  };
}

function extractBongda($: cheerio.CheerioAPI, url: string): ArticleContent {
  // The h1 is truncated with "…" on bongda.com.vn; og:title carries the full headline.
  const title = cleanFeedText($('meta[property="og:title"]').attr("content")) ||
    $("h1").first().text().trim() ||
    $("article h2").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // bongda.com.vn uses <section class="contentDetail"> with <figure>/<figcaption>
  const contentDetail = $("section.contentDetail");
  const container = contentDetail.length > 0
    ? contentDetail
    : $("article").length > 0
      ? $("article")
      : $(".detail-content, .cms-body, .entry-body, #main-content");

  // Remove junk elements before extraction (breadcrumbs, nav, sidebar widgets, forms)
  container.find("nav, .breadcrumb, .breadcrumbs, .form-rating, .match-stats, .social-share, script, style, .related-news, .tags").remove();

  // Pattern to filter out breadcrumb lines, sidebar widget text, source prefixes
  const junkPattern = /^(Mới nhất|Trang chủ|Bài viết|Phong độ|Thắng|Hòa|Thua|BongDa\.com\.vn|Tin liên quan|Xem thêm|Tags?:|Chia sẻ)/i;

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract from <figcaption> (player ratings, image captions with article text)
  container.find("figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !junkPattern.test(text)) pushUnique(paragraphs, seenP, text);
  });

  // Also extract from <p> tags (some articles use standard paragraphs)
  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !junkPattern.test(text)) {
      pushUnique(paragraphs, seenP, text);
    }
  });

  // Extract images from <figure> > <img> (player photos, article images)
  container.find("figure img, img").each((_, el) => {
    const src = resolveImageSrc($(el), url);
    if (
      src &&
      src.startsWith("http") &&
      src.includes("media.bongda") &&
      !src.includes("team-logo") &&
      !src.includes("logo")
    ) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent — strip junk, fix malformed nested figure/figcaption from bongda.com.vn
  let htmlContent: string | undefined;

  const sapoText = description?.trim() || $('meta[property="og:description"]').attr("content")?.trim();
  if (sapoText && sapoText.length > 20) {
    pushUnique(paragraphs, seenP, sapoText);
  }

  const contentClone = contentDetail.length > 0 ? contentDetail.clone() : container.clone();
  if (sapoText && sapoText.length > 20) {
    contentClone.prepend(`<p class="sapo"><strong>${sapoText}</strong></p>`);
  }

  if (contentDetail.length > 0) {
    contentClone.find("nav, .breadcrumb, .breadcrumbs, .form-rating, .match-stats, .social-share, .related-news, .tags").remove();
    htmlContent = buildHtmlContent(contentClone, $, url) || undefined;
  } else {
    htmlContent = buildHtmlContent(contentClone, $, url) || undefined;
  }

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    htmlContent,
    images,
    sourceUrl: url,
    sourceName: "Bongda.com.vn",
  };
}

function extractBongdaplus(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const title =
    $("h1").first().text().trim() ||
    cleanFeedText($('meta[property="og:title"]').attr("content")) ||
    $("title").text().replace(/\s*[-|].*/, "").trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content");

  // `#postContent` is the body; the lead lives outside it in `.cont-view .summary`.
  const container = selectContainer(
    $,
    "#postContent, .news-detail, .detail-body, .content-news, .cms-body, article, [role=main]"
  );

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  const skipPatterns =
    /Giấy phép|GP-BTTTT|Phụ trách|toà soạn|tòa soạn|Tổng biên tập|BONGDAPLUS\.VN|Bản quyền|Copyright|Khi đăng ký nhận tin tức qua email|Bạn chưa có tài khoản\s*\?\s*Đăng ký ngay/i;
  const chrome = "nav, footer, .menu, .sidebar, .authen-nav, .footer, .banner, .copyright";

  const sapoText = cleanFeedText($(".cont-view .summary, .summary, .detail-sapo, .sapo").first().text());
  if (sapoText.length > 20 && !isSameText(sapoText, description)) pushUnique(paragraphs, seenP, sapoText);

  container
    .find("p, .sapo")
    .each((_, el) => {
      const $el = $(el);
      if ($el.closest(chrome).length) return;
      const text = $el.text().trim();
      if (text.length > 20 && !skipPatterns.test(text)) pushUnique(paragraphs, seenP, text);
    });

  if (paragraphs.length === 0) {
    $("p").each((_, el) => {
      const $el = $(el);
      if ($el.closest(chrome).length) return;
      const text = $el.text().trim();
      if (text.length > 40 && !skipPatterns.test(text))
        pushUnique(paragraphs, seenP, text);
    });
  }

  const contentClone = container.clone();
  contentClone.find(`${chrome}, .box-ads, .article-relate`).remove();
  contentClone.find(".sapo, .detail-sapo").remove();
  if (sapoText.length > 20 && !isSameText(sapoText, description)) {
    contentClone.prepend(`<p class="sapo"><strong>${escapeHtml(sapoText)}</strong></p>`);
  }

  $("img").each((_, el) => {
    const $el = $(el);
    if ($el.closest(".thumb, [class*='banner'], [class*='sidebar'], [class*='related']").length > 0) return;

    const src = $el.attr("src") || $el.attr("data-src");
    if (
      src &&
      src.includes("cdn.bongdaplus.vn") &&
      !src.includes("logo") &&
      !src.includes("icon") &&
      !src.includes("_m.")
    ) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(contentClone, $, url) || undefined;

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    htmlContent,
    images,
    sourceUrl: url,
    sourceName: "Bongdaplus.vn",
    isThinContent: paragraphs.length <= 1,
  };
}

// 24h serves article photos from icdn.24h.com.vn, cdn.24h.com.vn, … and www.24h.com.vn/upload.
const IMG_24H_UPLOAD = /(^|[./])24h\.com\.vn\/upload\//;

// 24h.com.vn: uses #article_body for content, data-original for lazy images
function extract24h($: cheerio.CheerioAPI, url: string): ArticleContent {
  const sourceName = "24h";
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content") ||
    $("#article_sapo").text().trim() || undefined;

  // 24h nests article content inside .cate-24h-foot-arti-deta-info within #article_body
  // Use cascading fallback — .first() picks first DOM element, not first selector
  const container =
    $(".cate-24h-foot-arti-deta-info").first().length ? $(".cate-24h-foot-arti-deta-info").first()
    : $("#article_body").first().length ? $("#article_body").first()
    : $(".detail-content, .cms-body, article").first();

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Sapo/lead text
  const sapo = $("#article_sapo").text().trim();
  if (sapo && sapo.length > 20) pushUnique(paragraphs, seenP, sapo);

  // Junk patterns: save buttons, ad text, navigation, source attribution, match widgets
  const junkPattern = /^(Lưu bài viết|Bạn có thể xem lại|Dự đoán tỷ số|Cơ hội trúng|Nguồn:|Xem thêm|Tags?:|Chia sẻ|>>|To view this video)/i;
  const matchWidgetPattern = /^\S+\s*-\s*\S+\s+\d{1,2}\.\d{1,2}$/; // "Arsenal - Man City 22.03"

  container.find("p, figcaption").each((_, el) => {
    const $el = $(el);
    // Skip ad/promo/nav elements
    if ($el.closest("nav, .banner, .sidebar, .related-news, .box-game, [class*='banner'], [class*='game']").length) return;
    const text = $el.text().trim();
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (cleanText.length > 30 && !junkPattern.test(cleanText) && !matchWidgetPattern.test(cleanText)) {
      pushUnique(paragraphs, seenP, cleanText);
    }
  });

  // 24h uses data-original for lazy-loaded images (src is a base64 placeholder)
  const tinyImgPattern = /height\d{1,2}\b|width\d{1,2}height/;
  container.find("img").each((_, el) => {
    const $el = $(el);
    if ($el.closest("[class*='banner'], [class*='game'], .ad-unit, .box-game, .bv-lq").length) return;
    const src = resolveImageSrc($el, url);
    if (
      src &&
      IMG_24H_UPLOAD.test(src) &&
      !src.includes("logo") &&
      !src.includes("icon") &&
      !src.includes("close.svg") &&
      !src.includes("banner") &&
      !src.includes("box-game") &&
      !tinyImgPattern.test(src)
    ) {
      pushUnique(images, seenI, src);
    }
  });

  // Extract video info from JSON-LD or page metadata before building htmlContent
  // 24h has multiple ld+json blocks — iterate all to find VideoObject
  let videoThumbnail: string | undefined;
  let videoUrl: string | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (videoUrl) return; // already found
    try {
      const raw = $(el).html();
      if (!raw) return;
      const ld = JSON.parse(raw);
      const videoObj = ld?.video || (ld?.["@type"] === "VideoObject" ? ld : undefined);
      if (videoObj) {
        videoThumbnail = videoObj.thumbnailUrl;
        const contentUrl = videoObj.contentUrl;
        if (contentUrl && /\.(m3u8|mp4)(\?|$)/i.test(contentUrl)) {
          videoUrl = contentUrl;
        }
      }
    } catch { /* ignore parse errors */ }
  });
  // Fallback: extract video URL from <source> tags in the page
  if (!videoUrl) {
    $("source[src]").each((_, el) => {
      if (videoUrl) return;
      const src = $(el).attr("src") || "";
      if (/\.(m3u8|mp4)(\?|$)/i.test(src)) videoUrl = src;
    });
  }

  // Build htmlContent — preserve bold headings and inline images
  const clone = container.clone();
  if (sapo && sapo.length > 20) {
    clone.find("#article_sapo").remove();
    clone.prepend(`<p class="sapo"><strong>${sapo}</strong></p>`);
  }
  // Remove junk: ads, scripts, related articles, minigame, banners
  clone.find("script, style, section, .bv-lq, .box-game, .ad-unit, [data-embed-code-minigame], .tuht_all").remove();

  // Replace video player divs with inline video or clickable thumbnail
  clone.find(".viewVideoPlay").each((_, el) => {
    const $vp = $(el);
    const thumb = videoThumbnail || heroImage;
    if (videoUrl) {
      // Embed data attributes for client-side HLS/MP4 player
      $vp.replaceWith(
        `<div class="article-video-player" data-video-src="${videoUrl}"` +
        (thumb ? ` data-poster="${thumb}"` : "") +
        ` data-source-url="${url}" data-source-name="${sourceName}">` +
        `</div>`
      );
    } else if (thumb) {
      // Fallback: clickable thumbnail linking to original article
      $vp.replaceWith(
        `<figure class="article-video-placeholder">` +
        `<a href="${url}" target="_blank" rel="noopener noreferrer">` +
        `<img src="${thumb}" alt="${sanitizeText(title)}" loading="lazy" />` +
        `<span class="video-play-overlay"></span>` +
        `</a>` +
        `<figcaption>Video — nhấn để xem trên ${sourceName}</figcaption>` +
        `</figure>`
      );
    } else {
      $vp.remove();
    }
  });

  // Remove ad/promo link boxes (navigation banners inside article)
  clone.find("div[style*='background-color:#FFFFFF']").each((_, el) => {
    const $d = $(el);
    // 24h inserts nav boxes with tiny banner images (width230height30 etc.)
    if ($d.find("img[src*='width2']").length > 0) $d.remove();
  });
  // Remove in-image related article overlays and tracking pixels
  clone.find("#in-image-close, .img_tin_lien_quan_trong_bai, img[style*='display:none']").remove();
  // Remove empty paragraphs and junk text (keep <p> that contain images)
  clone.find("p").each((_, el) => {
    const $p = $(el);
    if ($p.find("img").length > 0) return; // keep image-containing paragraphs
    const text = $p.text().trim();
    if (text.length < 5 || junkPattern.test(text) || matchWidgetPattern.test(text)) $p.remove();
  });
  // Resolve lazy-loaded images: replace data-original → src, remove junk images
  // Collect removals first to avoid mutation during iteration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toRemove: cheerio.Cheerio<any>[] = [];
  clone.find("img").each((_, el) => {
    const $el = $(el);
    const realSrc = resolveImageSrc($el, url);
    const alt = $el.attr("alt")?.trim() || "";
    const isArticleImage = realSrc
      && IMG_24H_UPLOAD.test(realSrc)
      && alt.length > 5 // 24h only sets alt text on real article images
      && !tinyImgPattern.test(realSrc)
      && !realSrc.includes("close.svg")
      && !realSrc.includes("banner")
      && !realSrc.includes("box-game")
      && !realSrc.includes("logo");
    if (isArticleImage) {
      $el.attr("src", realSrc);
      $el.removeAttr("data-original");
      $el.removeAttr("data-src");
      $el.attr("loading", "lazy");
    } else {
      toRemove.push($el);
    }
  });
  for (const $el of toRemove) $el.remove();
  const htmlContent = buildHtmlContent(clone, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName,
    ...(videoUrl ? { videoUrl } : {}),
  };
}

function extractAnfieldWatch(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  // og:description is often "Read more." on AW — ignore it
  const description = ogDesc && ogDesc.length > 20 ? ogDesc : undefined;

  // AW uses .main__article > .basic-text for content (not .entry-content or <article>)
  const container = $(".main__article, .basic-text, .post-content").first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Filter out store widget text, ad labels, and promotional links
  const junkPattern = /^(LFC x adidas|Shop the|ADVERTISEMENT|Ad$|🚨|🔴|👉)/;

  container.find("p").each((_, el) => {
    const $el = $(el);
    // Skip store widgets and ad paragraphs
    if ($el.closest(".store-widget, .ad-unit, [class*='store']").length) return;
    const text = $el.text().trim();
    if (text.length > 20 && !junkPattern.test(text)) {
      pushUnique(paragraphs, seenP, text);
    }
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("favicon")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $, url) || undefined;

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    htmlContent,
    images,
    sourceUrl: url,
    sourceName: "Anfield Watch",
  };
}

function extractWordPress(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // Empire of the Kop: body is #article-body; .entry-content is the older WordPress theme.
  const container = selectContainer($, "#article-body, .entry-content, .post-content, article");
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $, url) || undefined;

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    htmlContent,
    images,
    sourceUrl: url,
    sourceName: detectSource(url).name,
  };
}

// Liverpool Echo uses Reach CMS (shared with Mirror, Express, etc.)
function extractLiverpoolEcho($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // Echo (Reach) now renders <article id="article-body" data-testid="body"> with hashed classes.
  const container = selectContainer(
    $,
    "article#article-body, [data-testid='body'], [data-article-body], .article-body, article, [role=main], main"
  );
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (
      text.length > 20 &&
      !text.includes("Sign up") &&
      !text.includes("newsletter") &&
      !text.includes("Follow us")
    ) {
      pushUnique(paragraphs, seenP, text);
    }
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: detectSource(url).name || "Liverpool Echo",
  };
}

// --- Shared Vietnamese extractor helper (DRY for dantri, vietnamnet, tuoitre, thanhnien) ---

function extractVietnameseGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  containerSelectors: string,
  sourceName: string,
  opts?: { sapoSelector?: string; htmlContent?: boolean; removeSelectors?: string }
): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = stripSourcePrefix($('meta[property="og:description"]').attr("content"));

  const container = selectContainer($, containerSelectors);
  const contentClone = container.clone();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract sapo/lead text
  let sapoText: string | undefined;
  if (opts?.sapoSelector) {
    const $sapo = $(opts.sapoSelector).first();
    let sapo = $sapo.text().trim();
    sapo = stripSourcePrefix(sapo);
    if (sapo && sapo.length > 20) {
      // The reader prints `description` as the lead: a body paragraph repeating it is a duplicate.
      if (!isSameText(sapo, description)) pushUnique(paragraphs, seenP, sapo);
      sapoText = sapo;
      contentClone.find(opts.sapoSelector).first().remove();
    }
  }

  // Extract paragraphs + figcaptions (some VN sites use figcaption for article text)
  container.find("p, figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el), url);
    if (src && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent when opted in
  let htmlContent: string | undefined;
  if (opts?.htmlContent !== false) {
    // Per-source junk that has no reusable class name (topic teasers, etc.)
    if (opts?.removeSelectors) contentClone.find(opts.removeSelectors).remove();
    // The article layout already renders `description` as the lead paragraph, so
    // re-inserting an identical sapo prints the same sentence twice on the page.
    if (sapoText && !isSameText(sapoText, description)) {
      contentClone.prepend(`<p class="sapo"><strong>${sapoText}</strong></p>`);
    }
    htmlContent = buildHtmlContent(contentClone, $, url) || undefined;
  }

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images, htmlContent,
    sourceUrl: url,
    sourceName,
  };
}

// Verified via DevTools: `article` tag (11p, 2fig), sapo in h2 tag
function extractDantri($: cheerio.CheerioAPI, url: string): ArticleContent {
  // `[data-slot=content]` is the body only; the sapo is a sibling `h2[data-slot=sapo]`
  // (choosing `article` put the sapo in both the container and the prepended lead).
  return extractVietnameseGeneric($, url,
    "[data-slot='content'], article, .dt-font-arial, .singular-content, .e-magazine__body, [role=main]",
    "Dân Trí",
    { sapoSelector: "h2[data-slot='sapo'], h2.singular-sapo, h2.e-magazine__sapo" }
  );
}

// Verified via DevTools: `.maincontent` (17p, 2fig), figcaption for photo galleries
function extractVietnamnet($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".maincontent, .content-detail, article, [role=main]",
    "VietNamNet"
  );
}

// Verified via DevTools: `.detail-cmain` (20p, 2fig), sapo in `h2.detail-sapo`
function extractTuoitre($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".detail-content.afcbc-body, .detail-cmain, .detail-content, article, [role=main]",
    "Tuổi Trẻ",
    { sapoSelector: "h2.detail-sapo" }
  );
}

// Verified via DevTools: `.detail-content` (15p, 3fig), sapo in `.detail-sapo`
function extractThanhnien($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".detail-content.afcbc-body, .detail-cmain, .detail-content, .detail__cmain-main, .detail__content, .article-body, article, [role=main]",
    "Thanh Niên",
    { sapoSelector: ".detail-sapo, .detail__sapo" }
  );
}

function extractBongda24h($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".the-article-content, .article-content, .news-detail-content, .detail-content, .content-detail, .article-body, article, [role=main]",
    "Bóng Đá 24h",
    {
      sapoSelector: ".the-article-content .summary, .article-sapo, .sapo, h2",
      // "Khám phá thêm nội dung hấp dẫn trong các chủ đề liên quan:" — the teaser
      // line above the club-crest tag strip. `.block` is too generic to strip
      // globally, so it is scoped to this source.
      removeSelectors: ".block, .clear1px",
    }
  );
}

function extractThethao247($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".content-detail, .article-content, .detail-content, .post-content, article, [role=main]",
    "Thể Thao 247",
    { sapoSelector: ".sapo, .article-sapo, h2" }
  );
}

function extractSoha($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".detail-content, .news-content, .article-content, .content-detail, article, [role=main]",
    "Soha",
    { sapoSelector: ".sapo, .news-sapo, h2" }
  );
}

// vietnam.vn uses .post-detail-body for article content (Next.js SSR site)
function extractVietnamvn($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(".post-detail-body, .post-detail-container, .ant-layout-content, [role=main]").first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Filter footer/legal text
  const junkPattern = /^(Nguồn:|BỘ VĂN HÓA|Chịu trách nhiệm|Cục trưởng|Trụ sở|Giấy phép)/;

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !junkPattern.test(text)) {
      pushUnique(paragraphs, seenP, text);
    }
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images, htmlContent,
    sourceUrl: url,
    sourceName: "Vietnam.vn",
  };
}

// Verified via DevTools: `#abody.shortcode-content.ck-content` (15p, 3img), no <article> tag
// Images are interleaved inside <p> tags — must produce htmlContent for inline rendering
function extractWebthethao($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(
    "#abody, .shortcode-content.ck-content, .detail-content, .article-content, [role=main]"
  ).first();

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Junk patterns: promo links, section headers that aren't real content
  const junkPattern = /^(>>>|Xem thêm|Tags?:|Chia sẻ|Phong độ .+ \d+ trận|Lịch sử đối đầu)/i;

  container.find("p, figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !junkPattern.test(text)) {
      pushUnique(paragraphs, seenP, text);
    }
  });

  container.find("img").each((_, el) => {
    const src = resolveImageSrc($(el), url);
    if (src && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Remove junk elements before building HTML
  const clone = container.clone();
  clone.find("script, style, .related-news, .tags, nav").remove();
  // Remove junk paragraphs from HTML
  clone.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (junkPattern.test(text)) $(el).remove();
  });
  const htmlContent = buildHtmlContent(clone, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "Webthethao",
  };
}

function extractZnews($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // znews.vn uses .the-article-body as primary container (verified via DevTools)
  const container = $(
    ".the-article-body, .article-content, article, [role=main]"
  ).first();

  // Remove related/junk elements embedded inside the container
  container.find(".inner-article, table.article, .notebox, .the-article-tags, .sidebar, .topics, .the-article-credit").remove();

  // Clean up nested headers before cloning for htmlContent
  const contentClone = container.clone();
  contentClone.find("header.the-article-header, header").remove();

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract lead/sapo text
  const sapo = $(".the-article-summary").first().text().trim();
  if (sapo && sapo.length > 20) {
    pushUnique(paragraphs, seenP, sapo);
    contentClone.find(".the-article-summary").first().remove();
    contentClone.prepend(`<p class="sapo"><strong>${sapo}</strong></p>`);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el), url);
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent for rich inline rendering
  const htmlContent = buildHtmlContent(contentClone, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "ZNews",
    isThinContent: paragraphs.length <= 2,
  };
}

function extractVnexpress($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  // og:description opens with the dateline stamp ("Anh- Dominik …"): strip it so it matches the sapo.
  const description = $('meta[property="og:description"]').attr("content")?.replace(/^[^\s-]{2,10}\s*-\s+/, "") ||
    $("p.description").first().text().trim();

  // VnExpress uses .fck_detail as primary container (verified via DevTools)
  const container = $(
    ".fck_detail, article.fck_detail, .article-content, article, [role=main]"
  ).first();
  const contentClone = container.clone();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract lead/sapo text
  // `<span class="location-stamp">Anh</span>` is glued to the lead text; drop it.
  const sapo = $("p.description").first().clone().find(".location-stamp").remove().end().text().trim();
  if (sapo && sapo.length > 20) {
    if (sapo !== description) {
      pushUnique(paragraphs, seenP, sapo);
    }
    contentClone.find("p.description").first().remove();
    contentClone.prepend(`<p class="sapo"><strong>${sapo}</strong></p>`);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el), url);
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(contentClone, $, url) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images, htmlContent,
    sourceUrl: url,
    sourceName: "VnExpress",
  };
}

/**
 * Navigation-like = mostly links (site menu, "related" rail): a real article body is
 * prose with a few links. `<body>` of a WordPress theme used to win here and the
 * cached "article" of anfieldindex was the site menu.
 */
export function isNavigationLike(
  $container: cheerio.Cheerio<AnyNode>,
  $: cheerio.CheerioAPI
): boolean {
  const text = $container.text().replace(/\s+/g, " ").trim();
  if (text.length === 0) return true;
  const linkText = $container.find("a").text().replace(/\s+/g, " ").trim();
  if (linkText.length / text.length > 0.5) return true;
  let proseChars = 0;
  $container.find("p").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 20) proseChars += t.length;
  });
  return proseChars < 200 && $container.find("a").length > 15;
}

// Fallback for known sources without a dedicated extractor (when Readability also fails).
function extractGeneric(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  // A real article region only — NEVER `<body>` (menus, footers, comment forms).
  let container = selectContainer($, "article, main, [role=main], .entry-content, .post-content, .article-body");
  if (container.length > 0 && isNavigationLike(container, $)) container = $();

  const paragraphs: string[] = [];
  const seenP = new Set<string>();
  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });
  const htmlContent = container.length ? buildHtmlContent(container.clone(), $, url) || undefined : undefined;

  return {
    title:
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "Article",
    heroImage: $('meta[property="og:image"]').attr("content"),
    description: $('meta[property="og:description"]').attr("content"),
    paragraphs,
    htmlContent,
    images: [],
    sourceUrl: url,
    sourceName: detectSource(url).name || new URL(url).hostname,
  };
}

function findExtractor(url: string): Extractor {
  const hostname = new URL(url).hostname;
  for (const [domain, fn] of Object.entries(extractors)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return fn;
  }
  return extractGeneric;
}

// --- Pure extraction (no network, no DB): testable against saved HTML ---

const BOT_CHALLENGE_TITLE = /^(just a moment|attention required|access denied|are you a (?:robot|human)|pardon our interruption|robot check|verifying you are human)/i;
const BOT_CHALLENGE_BODY = /javascript is (?:disabled|required)|enable javascript|verify (?:that )?you(?:'re| are) (?:a )?human|captcha|checking your browser|unusual traffic from your/i;

/** A WAF / bot-check page served with HTTP 200 (ESPN: "JavaScript is disabled…"). */
export function isBotChallengePage($: cheerio.CheerioAPI): boolean {
  if (BOT_CHALLENGE_TITLE.test($("title").first().text().trim())) return true;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  return bodyText.length < 2500 && BOT_CHALLENGE_BODY.test(bodyText);
}

/**
 * Byline / timestamp / media-caption lines a body can open with. ESPN (Readability) yields
 * "Beth LindopSep 30, 2026, 03:24 AM ETCloseBased in Liverpool, … is ESPN's correspondent…",
 * a bare "Sep 27, 2026, 06:32 PM ET" and a video caption "Xavi reveals … (0:58)".
 */
const LEADING_META_LINES: RegExp[] = [
  /\b\d{1,2}:\d{2}\s*(?:am|pm)\s*[a-z]{2,3}\b/i, // "03:24 AM ET"
  /\(\d{1,2}:\d{2}\)\s*$/, // "(0:58)" video duration
  /^by\s+\S/i,
  /^(?:updated|published|posted)\b/i,
  /\b\d+\s*min(?:ute)?s?\s+read\b/i,
  /\b(?:is|are)\s+espn'?s?\b.*\b(?:correspondent|writer|reporter|columnist|analyst)\b|^based in .{2,40}\b(?:espn|correspondent)/i,
];

/** Drop up to 5 leading byline/timestamp/caption lines — short ones only, so a real lede is never eaten. */
export function stripLeadingMetaLines(paragraphs: string[]): string[] {
  let i = 0;
  while (i < 5 && i < paragraphs.length && paragraphs[i].length < 260 && LEADING_META_LINES.some((re) => re.test(paragraphs[i].trim()))) i++;
  return i ? paragraphs.slice(i) : paragraphs;
}

/** True when `text` is the same prose as `lead`, or `lead` is an ellipsis-truncated start of it. */
function isLeadOf(text: string | undefined, lead: string | undefined): boolean {
  if (!text || !lead) return false;
  if (isSameText(text, lead)) return true;
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const l = norm(lead.replace(/(?:…|\.{2,})\s*$/, ""));
  const t = norm(text.replace(/(?:…|\.{2,})\s*$/, ""));
  // One is the opening of the other (og:description truncates, or extends, the first paragraph).
  return Math.min(l.length, t.length) > 40 && (t.startsWith(l) || l.startsWith(t));
}

/** The reader prints `description` as the lead: remove an identical first paragraph / `.sapo` from the body. */
function dropDuplicateLead(content: ArticleContent): void {
  const lead = content.description;
  if (!lead) return;
  if (isLeadOf(content.paragraphs[0], lead) && content.paragraphs.length > 1) content.paragraphs.shift();
  if (content.htmlContent) {
    const $h = cheerio.load(content.htmlContent, null, false);
    const $first = $h("p").first();
    if ($first.length && isLeadOf($first.text(), lead)) {
      // Only when the lead is genuinely the opening block (not a later paragraph that happens to match).
      const firstBlock = $h.root().children().first();
      if (firstBlock.is($first) || firstBlock.find($first).length > 0) {
        $first.remove();
        content.htmlContent = $h.html() || undefined;
      }
    }
  }
}

/** "Headline - ESPN" / "Headline | Sky Sports": the site tag belongs to the page <title>, not the headline. */
function stripSiteSuffix(title: string, url: string): string {
  const name = detectSource(url).name;
  if (!name) return title;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = title.replace(new RegExp(`\\s+[-–—|]\\s+${escaped}\\s*$`, "i"), "").trim();
  return stripped.length >= 12 ? stripped : title;
}

function finalizeContent(content: ArticleContent, $: cheerio.CheerioAPI, url: string): ArticleContent {
  content.title = stripSiteSuffix(cleanFeedText(content.title) || content.title, url);
  const description = content.description
    ? stripSnippetBoilerplate(cleanFeedText(stripSourcePrefix(content.description)))
    : "";
  // A description that is just the headline (Anfield Index meta: "<title> written on … by …") is no lead.
  content.description = description && !isSameText(description, content.title) ? description : undefined;
  content.paragraphs = content.paragraphs.map((p) => sanitizeText(p));
  // A body block repeating the headline (video / photo captions) is not prose.
  if (content.paragraphs.length > 1) {
    content.paragraphs = content.paragraphs.filter((p, i) => !(i === 0 && isSameText(p, content.title)));
  }
  if (/(^|\.)espn\.(com|co\.uk)$/i.test(new URL(url).hostname)) {
    content.paragraphs = stripLeadingMetaLines(content.paragraphs);
  }
  dropDuplicateLead(content);
  if (!content.heroImage) content.heroImage = $('meta[property="og:image"]').attr("content");
  // Last: share bars, menus, icons, repeats of the hero, promo cards come out of the HTML.
  return cleanArticleContent(content);
}

function normalizeHtmlLinks(html: string, baseUrl: string): string {
  const $h = cheerio.load(html, null, false);
  absolutizeLinks($h, $h.root(), baseUrl);
  return $h.html() || html;
}

export interface ExtractionResult {
  content: ArticleContent;
  /** False for empty / thin-without-body scrapes: do not store them as a successful scrape. */
  cacheable: boolean;
}

/**
 * HTML + URL → article. null = a bot-check page (never cache, never render).
 * Readability first for hosts without a dedicated extractor, then the per-site cheerio extractor.
 */
export async function extractFromHtml(html: string, url: string): Promise<ExtractionResult | null> {
  const $ = cheerio.load(html);
  if (isBotChallengePage($)) return null;

  // Check if this site has a dedicated extractor (skip Readability for those)
  const dedicatedExtractor = findExtractor(url);
  const hasDedicatedExtractor = dedicatedExtractor !== extractGeneric;

  // 1. Try Readability first (only for sites without dedicated extractors)
  const readable = hasDedicatedExtractor ? null : await extractWithReadability(html, url);
  // Readability can latch onto a menu / link rail when there is no article: treat that as a miss.
  const readableIsNav = readable
    ? (() => {
        const $r = cheerio.load(`<div id="r">${readable.htmlContent}</div>`);
        return isNavigationLike($r("#r"), $r);
      })()
    : false;
  if (readable && readable.length > 300 && !readableIsNav) {
    // Parse htmlContent for proper paragraph separation
    const $article = cheerio.load(readable.htmlContent);
    const paragraphs: string[] = [];
    $article("p, h2, h3, h4, li, figcaption").each((_, el) => {
      const text = $article(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });

    // Fallback to textContent split if HTML parsing yields nothing
    if (paragraphs.length === 0) {
      paragraphs.push(
        ...readable.textContent
          .split(/\n\n+/)
          .filter((p) => p.trim().length > 20)
          .map((p) => sanitizeText(p.trim()))
      );
    }

    const result = finalizeContent({
      title: readable.title,
      heroImage: $('meta[property="og:image"]').attr("content"),
      description: readable.excerpt?.replace(/\.{2,}$/, "") || $('meta[property="og:description"]').attr("content") || undefined,
      publishedAt: extractPublishedAt($),
      author: readable.byline ?? extractAuthor($),
      paragraphs,
      htmlContent: normalizeHtmlLinks(readable.htmlContent, url),
      images: [],
      sourceUrl: url,
      sourceName: detectSource(url).name,
      readingTime: estimateReadingTime(readable.textContent),
    }, $, url);
    console.log(
      `[extractor] ${result.sourceName} | method=readability | paragraphs=${result.paragraphs.length} | len=${readable.length}`
    );
    return { content: result, cacheable: result.paragraphs.length > 0 };
  }

  // 2. Fallback: per-site cheerio extractor
  const content = finalizeContent(dedicatedExtractor($, url), $, url);
  const realParagraphs = content.paragraphs.length;

  content.readingTime = estimateReadingTime(content.paragraphs.join(" "));

  // Detect thin content
  if (content.paragraphs.length <= 1) {
    content.isThinContent = true;
  }
  // Fallback: use og:description if no paragraphs
  if (content.paragraphs.length === 0 && content.description) {
    content.paragraphs = [content.description];
  }

  console.log(
    `[extractor] ${content.sourceName} | method=cheerio | paragraphs=${content.paragraphs.length} | thin=${content.isThinContent ?? false}`
  );
  // No real paragraph (only the description stand-in) = an empty scrape, not a success.
  return { content, cacheable: realParagraphs > 0 };
}

// --- Public API ---

export const scrapeArticle = cache(
  async (url: string): Promise<ArticleContent | null> => {
    // Only ever fetch configured news sources — see isKnownNewsSourceUrl.
    if (!isKnownNewsSourceUrl(url)) {
      console.warn(`[extractor] Refusing to fetch non-source URL: ${url.slice(0, 120)}`);
      return null;
    }
    // Sources that 403 every client (This Is Anfield): link-out only, the reader shows the source link.
    if (isLinkOutOnlyUrl(url)) return null;
    try {
      // 1. Check DB cache first (survives across requests, 24h TTL)
      const cached = await getCachedContent(url);
      if (cached) {
        console.log(`[extractor] Cache hit for ${new URL(url).hostname}`);
        return cached;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Honest UA: Reach sites/ESPN block spoofed Chrome (403 / 202 challenge).
          "User-Agent": NEWS_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        next: { revalidate: 3600 },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[article-extractor] ${res.status} for ${url}`);
        return null;
      }
      // A source may redirect (http→https, old→canonical path); refuse to render
      // a page that redirected off the source list.
      if (res.url && !isKnownNewsSourceUrl(res.url)) {
        console.warn(`[article-extractor] Redirected off-source: ${res.url.slice(0, 120)}`);
        return null;
      }

      const html = await res.text();
      const extracted = await extractFromHtml(html, url);
      if (!extracted) {
        console.warn(`[article-extractor] Bot-check / unreadable page, not cached: ${url.slice(0, 120)}`);
        return null;
      }
      // Cache result in DB (fire-and-forget) — but never an empty scrape or a challenge page.
      if (extracted.cacheable) cacheContent(url, extracted.content);
      return extracted.content;
    } catch (err) {
      console.warn(
        "[article-extractor] Failed:",
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }
);

export const getOgImage = cache(
  async (url: string): Promise<string | undefined> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": NEWS_USER_AGENT,
          Accept: "text/html",
        },
        next: { revalidate: 86400 },
      });
      clearTimeout(timeoutId);
      if (!res.ok) return undefined;

      const reader = res.body?.getReader();
      if (!reader) return undefined;

      let html = "";
      const decoder = new TextDecoder();
      while (html.length < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (html.includes("</head>")) break;
      }
      reader.cancel();

      const match = html.match(
        /property="og:image"\s+content="([^"]+)"/
      );
      return match?.[1];
    } catch {
      return undefined;
    }
  }
);
