/**
 * Extractor Selector Reference (verified via Chrome DevTools 2026-03-11)
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Source               │ Container Selectors (priority order)             │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ liverpoolfc.com      │ #__NEXT_DATA__ (JSON) → article, main           │
 * │ bbc.com              │ [data-component=text-block] → article, main     │
 * │ theguardian.com      │ article                                          │
 * │ empireofthekop.com   │ .entry-content → article                        │
 * │ anfieldwatch.co.uk   │ .main__article → .basic-text                    │
 * │ liverpoolecho.co.uk  │ [data-article-body] → .article-body → article  │
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
import type { ArticleContent } from "../types";
import sanitize from "sanitize-html";
import {
  extractWithReadability,
  estimateReadingTime,
  sanitizeText,
} from "./readability";
import { detectSource } from "../source-detect";
import { getServiceClient } from "../supabase-service";

// --- Content cache helpers (DB-level, survives serverless cold starts) ---

const CONTENT_CACHE_TTL_MS = 24 * 3600 * 1000; // 24 hours

async function getCachedContent(url: string): Promise<ArticleContent | null> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("articles")
      .select("content_en, content_scraped_at")
      .eq("url", url)
      .single();

    if (!data?.content_en) return null;

    const scrapedAt = new Date(data.content_scraped_at).getTime();
    if (Date.now() - scrapedAt > CONTENT_CACHE_TTL_MS) return null;

    return data.content_en as ArticleContent;
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
      .eq("url", url);
  } catch (err) {
    console.error("[article-extractor] Cache write failed:", err);
  }
}

const ARTICLE_SANITIZE_OPTS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat([
    "img", "figure", "figcaption", "h1", "h2", "h3", "h4",
  ]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    div: ["class", "data-video-src", "data-poster", "data-source-url", "data-source-name"],
    figure: ["class"],
    span: ["class"],
  },
  allowedSchemes: ["https", "http"],
  exclusiveFilter: (frame) => {
    // Drop known ad or junk classes
    if (frame.tag === "div" && frame.attribs.class) {
      const cls = frame.attribs.class.toLowerCase();
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

/** Resolve actual image URL, preferring data-original/data-src over placeholder src */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveImageSrc($el: cheerio.Cheerio<any>): string | undefined {
  const dataOriginal = $el.attr("data-original");
  if (dataOriginal && dataOriginal.startsWith("http")) return dataOriginal;
  const dataSrc = $el.attr("data-src");
  if (dataSrc && dataSrc.startsWith("http")) return dataSrc;
  const src = $el.attr("src");
  if (src && src.startsWith("http")) return src;
  return undefined;
}


/**
 * Centralized helper to build high-fidelity HTML content from a Cheerio container.
 * - Resolves lazy-loaded images to their true sources.
 * - Flattens malformed nested <figure><figcaption> structures (e.g. from bongda.com.vn).
 * - Sanitizes using ARTICLE_SANITIZE_OPTS.
 */
function buildHtmlContent(
  container: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): string | undefined {
  if (!container || container.length === 0) return undefined;

  // 1. Resolve lazy-loaded images to their true source
  container.find("img").each((_, el) => {
    const $el = $(el);
    const realSrc = resolveImageSrc($el);
    if (realSrc) {
      $el.attr("src", realSrc);
      $el.removeAttr("data-src");
      $el.removeAttr("data-original");
      $el.attr("loading", "lazy");
    }
  });

  // Normalize nested tables with images (like ZNews) into standard figure > img
  container.find("table").each((_, el) => {
    const $tbl = $(el);
    if ($tbl.find("img").length > 0) {
      const $img = $tbl.find("img").first();
      const $caption = $tbl.find("p, figcaption, em").not($img.parent()).first();
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

function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  const raw =
    $('meta[name="author"]').attr("content") ||
    $('meta[property="article:author"]').attr("content") ||
    $('meta[name="byl"]').attr("content") ||
    $('[rel="author"]').first().text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    undefined;
  if (raw && /^https?:\/\//i.test(raw)) return undefined;
  return raw;
}

function extractPublishedAt($: cheerio.CheerioAPI): string | undefined {
  return (
    $('meta[property="article:published_time"]').attr("content") ||
    $('meta[name="article:published_time"]').attr("content") ||
    $('meta[property="og:article:published_time"]').attr("content") ||
    $('meta[name="pubdate"]').attr("content") ||
    $('meta[name="date"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    undefined
  );
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
  "empireofthekop.com": extractWordPress,
  "znews.vn": extractZnews,
  "vnexpress.net": extractVnexpress,
  "dantri.com.vn": extractDantri,
  "vietnamnet.vn": extractVietnamnet,
  "tuoitre.vn": extractTuoitre,
  "thanhnien.vn": extractThanhnien,
  "webthethao.vn": extractWebthethao,
  "vietnam.vn": extractVietnamvn,
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

  if (nextDataScript) {
    try {
      const data = JSON.parse(nextDataScript);
      const body = data?.props?.pageProps?.data?.article?.body;
      if (Array.isArray(body)) {
        for (const block of body) {
          if (
            block.type === "paragraph" &&
            typeof block.value === "string"
          ) {
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

  const htmlContent = buildHtmlContent(container, $) || undefined;

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
    sourceName: "LiverpoolFC.com",
  };
}

function extractBBC($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // BBC Sport uses multiple container patterns including data-component blocks
  const container = $(
    "article, [data-component='text-block'], #main-content, [role=main], main"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // BBC uses data-component="text-block" for article paragraphs
  $("[data-component='text-block'] p, article p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  // Fallback: try container if specific selectors yield nothing
  if (paragraphs.length === 0) {
    container.find("p").each((_, el) => {
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

  const htmlContent = buildHtmlContent(container, $) || undefined;

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
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $("article");
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img[src*='guim']").each((_, el) => {
    const src = $(el).attr("src");
    if (src) pushUnique(images, seenI, src);
  });

  // Build htmlContent for rich figure/img/figcaption layout (cheerio fallback path only)
  const htmlContent = buildHtmlContent(container, $) || undefined;

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
  const title = $("h1").first().text().trim() ||
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
    const src = resolveImageSrc($(el));
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
  if (contentDetail.length > 0) {
    contentDetail.find("nav, .breadcrumb, .breadcrumbs, .form-rating, .match-stats, .social-share, .related-news, .tags").remove();
    htmlContent = buildHtmlContent(contentDetail, $) || undefined;
  } else {
    htmlContent = buildHtmlContent(container, $) || undefined;
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
    $("title").text().replace(/\s*[-|].*/, "").trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content");

  const container = $(
    ".news-detail, .detail-body, .detail-sapo, .sapo, .content-news, .cms-body, article, [role=main]"
  ).first();

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  const skipPatterns =
    /Giấy phép|GP-BTTTT|Phụ trách|toà soạn|tòa soạn|Tổng biên tập|BONGDAPLUS\.VN|Bản quyền|Copyright|Khi đăng ký nhận tin tức qua email|Bạn chưa có tài khoản\s*\?\s*Đăng ký ngay/i;

  container
    .find("p, .sapo")
    .each((_, el) => {
      const $el = $(el);
      if (
        $el.closest(
          "nav, footer, .menu, .sidebar, .authen-nav, .footer, .banner, .copyright"
        ).length
      )
        return;
      const text = $el.text().trim();
      if (text.length > 20 && !skipPatterns.test(text)) pushUnique(paragraphs, seenP, text);
    });

  if (paragraphs.length === 0) {
    $("p").each((_, el) => {
      const $el = $(el);
      if (
        $el.closest(
          "nav, footer, .menu, .sidebar, .authen-nav, .footer, .banner, .copyright"
        ).length
      )
        return;
      const text = $el.text().trim();
      if (text.length > 40 && !skipPatterns.test(text))
        pushUnique(paragraphs, seenP, text);
    });
  }

  const contentClone = container.clone();
  contentClone.find("nav, footer, .menu, .sidebar, .authen-nav, .footer, .banner, .copyright, .box-ads, .article-relate").remove();

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

  const htmlContent = buildHtmlContent(contentClone, $) || undefined;

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
    isThinContent: true, // always thin — client-rendered site
  };
}

function extractVietnamese(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(
    "article, .detail-content, .content-detail, .cms-body, .entry-body, #main-content, [role=main]"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img").each((_, el) => {
    const src = resolveImageSrc($(el));
    if (src && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $) || undefined;

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
    sourceUrl: url,
    sourceName: detectSource(url).name,
  };
}

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
    const src = resolveImageSrc($el);
    if (
      src &&
      src.includes("icdn.24h.com.vn/upload") &&
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
    const realSrc = resolveImageSrc($el);
    const alt = $el.attr("alt")?.trim() || "";
    const isArticleImage = realSrc
      && realSrc.includes("icdn.24h.com.vn/upload")
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
  const htmlContent = buildHtmlContent(clone, $) || undefined;

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

  const htmlContent = buildHtmlContent(container, $) || undefined;

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

  const container = $(".entry-content, article, .post-content").first();
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

  const htmlContent = buildHtmlContent(container, $) || undefined;

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

  const container = $(
    "[data-article-body], .article-body, article, [role=main], main"
  ).first();
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

  const htmlContent = buildHtmlContent(container, $) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, htmlContent, images,
    sourceUrl: url,
    sourceName: "Liverpool Echo",
  };
}

function extractGenericEnglish(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $("article, [role=main], .article-body, main").first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  const htmlContent = buildHtmlContent(container, $) || undefined;

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

// --- Shared Vietnamese extractor helper (DRY for dantri, vietnamnet, tuoitre, thanhnien) ---

function extractVietnameseGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  containerSelectors: string,
  sourceName: string,
  opts?: { sapoSelector?: string; htmlContent?: boolean }
): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(containerSelectors).first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract sapo/lead text
  if (opts?.sapoSelector) {
    const sapo = $(opts.sapoSelector).first().text().trim();
    if (sapo && sapo.length > 20) pushUnique(paragraphs, seenP, sapo);
  }

  // Extract paragraphs + figcaptions (some VN sites use figcaption for article text)
  container.find("p, figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el));
    if (src && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent when opted in
  let htmlContent: string | undefined;
  if (opts?.htmlContent !== false) {
    htmlContent = buildHtmlContent(container, $) || undefined;
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
  return extractVietnameseGeneric($, url,
    "article, .singular-content, .e-magazine__body, [role=main]",
    "Dân Trí",
    { sapoSelector: "h2.singular-sapo, h2.e-magazine__sapo" }
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
    ".detail-cmain, .detail-content, article, [role=main]",
    "Tuổi Trẻ",
    { sapoSelector: "h2.detail-sapo" }
  );
}

// Verified via DevTools: `.detail-content` (15p, 3fig), sapo in `.detail-sapo`
function extractThanhnien($: cheerio.CheerioAPI, url: string): ArticleContent {
  return extractVietnameseGeneric($, url,
    ".detail-content, .detail__content, .article-body, article, [role=main]",
    "Thanh Niên",
    { sapoSelector: ".detail-sapo" }
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

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
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
    const src = resolveImageSrc($(el));
    if (src && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent — images are interleaved with text in <p> tags
  let htmlContent: string | undefined;

  // Remove junk elements before building HTML
  const clone = container.clone();
  clone.find("script, style, .related-news, .tags, nav").remove();
  // Remove junk paragraphs from HTML
  clone.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (junkPattern.test(text)) $(el).remove();
  });
  htmlContent = buildHtmlContent(clone, $) || undefined;

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
  contentClone.find("header").remove();

  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract lead/sapo text
  const sapo = $(".the-article-summary").first().text().trim();
  if (sapo && sapo.length > 20) pushUnique(paragraphs, seenP, sapo);

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el));
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  // Build htmlContent for rich inline rendering
  const htmlContent = buildHtmlContent(contentClone, $) || undefined;

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
  const description = $('meta[property="og:description"]').attr("content") ||
    $("p.description").first().text().trim();

  // VnExpress uses .fck_detail as primary container (verified via DevTools)
  const container = $(
    ".fck_detail, article.fck_detail, .article-content, article, [role=main]"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];
  const seenP = new Set<string>();
  const seenI = new Set<string>();

  // Extract lead/sapo text
  const sapo = $("p.description").first().text().trim();
  if (sapo && sapo.length > 20 && sapo !== description) {
    pushUnique(paragraphs, seenP, sapo);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) pushUnique(paragraphs, seenP, text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = resolveImageSrc($(el));
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      pushUnique(images, seenI, src);
    }
  });

  const htmlContent = buildHtmlContent(container, $) || undefined;

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images, htmlContent,
    sourceUrl: url,
    sourceName: "VnExpress",
  };
}

function extractGeneric(
  $: cheerio.CheerioAPI,
  url: string
): ArticleContent {
  return {
    title:
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      "Article",
    heroImage: $('meta[property="og:image"]').attr("content"),
    description: $('meta[property="og:description"]').attr("content"),
    paragraphs: [],
    images: [],
    sourceUrl: url,
    sourceName: new URL(url).hostname,
  };
}

function findExtractor(url: string): Extractor {
  const hostname = new URL(url).hostname;
  for (const [domain, fn] of Object.entries(extractors)) {
    if (hostname.includes(domain)) return fn;
  }
  return extractGeneric;
}

// --- Public API ---

export const scrapeArticle = cache(
  async (url: string): Promise<ArticleContent | null> => {
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
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        next: { revalidate: 3600 },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[article-extractor] ${res.status} for ${url}`);
        return null;
      }

      const html = await res.text();

      // Check if this site has a dedicated extractor (skip Readability for those)
      const dedicatedExtractor = findExtractor(url);
      const hasDedicatedExtractor = dedicatedExtractor !== extractGeneric;

      // 1. Try Readability first (only for sites without dedicated extractors)
      const readable = hasDedicatedExtractor ? null : await extractWithReadability(html, url);
      if (readable && readable.length > 300) {
        const $ = cheerio.load(html);

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

        const result = {
          title: readable.title,
          heroImage: $('meta[property="og:image"]').attr("content"),
          description: readable.excerpt?.replace(/\.{2,}$/, "") || undefined,
          publishedAt: extractPublishedAt($),
          author: readable.byline ?? extractAuthor($),
          paragraphs,
          htmlContent: readable.htmlContent,
          images: [],
          sourceUrl: url,
          sourceName: detectSource(url).name,
          readingTime: estimateReadingTime(readable.textContent),
        };
        console.log(
          `[extractor] ${result.sourceName} | method=readability | paragraphs=${paragraphs.length} | len=${readable.length}`
        );
        // Cache result in DB (fire-and-forget)
        cacheContent(url, result);
        return result;
      }

      // 2. Fallback: per-site cheerio extractor
      const $ = cheerio.load(html);
      const extractor = findExtractor(url);
      const content = extractor($, url);

      // Sanitize paragraphs
      content.paragraphs = content.paragraphs.map((p) => sanitizeText(p));
      content.readingTime = estimateReadingTime(
        content.paragraphs.join(" ")
      );

      // Detect thin content
      if (content.paragraphs.length <= 1) {
        content.isThinContent = true;
      }

      // Fallback: use og:image if no hero image
      if (!content.heroImage) {
        content.heroImage = $('meta[property="og:image"]').attr("content");
      }
      // Fallback: use og:description if no paragraphs
      if (content.paragraphs.length === 0 && content.description) {
        content.paragraphs = [content.description];
      }

      console.log(
        `[extractor] ${content.sourceName} | method=cheerio | paragraphs=${content.paragraphs.length} | thin=${content.isThinContent ?? false}`
      );
      // Cache result in DB (fire-and-forget)
      cacheContent(url, content);
      return content;
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
          "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)",
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
