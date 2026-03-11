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

const ARTICLE_SANITIZE_OPTS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat([
    "img", "figure", "figcaption", "h1", "h2", "h3", "h4",
  ]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["https", "http"],
};

type Extractor = ($: cheerio.CheerioAPI, url: string) => ArticleContent;

// --- Common helpers ---

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

function detectSourceName(url: string): string {
  if (url.includes("liverpoolfc.com")) return "LiverpoolFC.com";
  if (url.includes("bbc.com") || url.includes("bbc.co.uk")) return "BBC Sport";
  if (url.includes("theguardian.com")) return "The Guardian";
  if (url.includes("thisisanfield.com")) return "This Is Anfield";
  if (url.includes("liverpoolecho.co.uk")) return "Liverpool Echo";
  if (url.includes("skysports.com")) return "Sky Sports";
  if (url.includes("anfieldwatch.co.uk")) return "Anfield Watch";
  if (url.includes("empireofthekop.com")) return "Empire of the Kop";
  if (url.includes("bongda.com.vn")) return "Bongda.com.vn";
  if (url.includes("24h.com.vn")) return "24h.com.vn";
  if (url.includes("bongdaplus.vn")) return "Bongdaplus.vn";
  if (url.includes("znews.vn")) return "ZNews";
  if (url.includes("vnexpress.net")) return "VnExpress";
  if (url.includes("dantri.com.vn")) return "Dân Trí";
  if (url.includes("vietnamnet.vn")) return "VietNamNet";
  if (url.includes("tuoitre.vn")) return "Tuổi Trẻ";
  if (url.includes("thanhnien.vn")) return "Thanh Niên";
  return new URL(url).hostname;
}

// --- Per-site extractors (cheerio fallbacks) ---

const extractors: Record<string, Extractor> = {
  "liverpoolfc.com": extractLfcOfficial,
  "bbc.com": extractBBC,
  "bbc.co.uk": extractBBC,
  "theguardian.com": extractGuardian,
  "bongda.com.vn": extractBongda,
  "24h.com.vn": extractVietnamese,
  "bongdaplus.vn": extractBongdaplus,
  // thisisanfield.com disabled — persistent redirect loop (ERR_TOO_MANY_REDIRECTS)
  "anfieldwatch.co.uk": extractWordPress,
  "liverpoolecho.co.uk": extractGenericEnglish,
  "skysports.com": extractGenericEnglish,
  "empireofthekop.com": extractWordPress,
  "znews.vn": extractZnews,
  "vnexpress.net": extractVnexpress,
  "dantri.com.vn": extractDantri,
  "vietnamnet.vn": extractVietnamnet,
  "tuoitre.vn": extractTuoitre,
  "thanhnien.vn": extractThanhnien,
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
            if (text.length > 20) paragraphs.push(text);
          } else if (block.type === "image" && block.value?.url) {
            images.push(block.value.url);
          }
        }
      }
    } catch {
      // Fall through to cheerio
    }
  }

  if (paragraphs.length === 0) {
    const container = $(
      "article, .article-body, [data-testid='article-body'], main"
    ).first();
    container.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });
  }

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
    sourceUrl: url,
    sourceName: "LiverpoolFC.com",
  };
}

function extractBBC($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container =
    $("article").length > 0 ? $("article") : $("[role=main]");
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (
      src &&
      src.startsWith("http") &&
      !src.includes("placeholder")
    ) {
      images.push(src);
    }
  });

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
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

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img[src*='guim']").each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src);
  });

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
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

  const paragraphs: string[] = [];
  const images: string[] = [];

  // Extract from <figcaption> (player ratings, image captions with article text)
  container.find("figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  // Also extract from <p> tags (some articles use standard paragraphs)
  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (
      text.length > 20 &&
      !text.startsWith("BongDa.com.vn") &&
      !paragraphs.includes(text)
    ) {
      paragraphs.push(text);
    }
  });

  // Extract images from <figure> > <img> (player photos, article images)
  container.find("figure img, img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (
      src &&
      src.startsWith("http") &&
      src.includes("media.bongda") &&
      !src.includes("team-logo") &&
      !src.includes("logo")
    ) {
      if (!images.includes(src)) images.push(src);
    }
  });

  // Build htmlContent preserving figure/img/figcaption structure for inline rendering
  const htmlContent = contentDetail.length > 0
    ? sanitize(contentDetail.html() || "", ARTICLE_SANITIZE_OPTS)
    : undefined;

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

  const paragraphs: string[] = [];
  const images: string[] = [];

  $(
    ".news-detail, .detail-body, .detail-sapo, .sapo, .content-news, .cms-body, article, [role=main]"
  )
    .find("p, .sapo")
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });

  if (paragraphs.length === 0) {
    const skipPatterns =
      /Giấy phép|GP-BTTTT|Phụ trách|toà soạn|tòa soạn|Tổng biên tập|BONGDAPLUS\.VN|Bản quyền|Copyright/i;
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
        paragraphs.push(text);
    });
  }

  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (
      src &&
      src.includes("cdn.bongdaplus.vn") &&
      !src.includes("logo") &&
      !src.includes("icon") &&
      !src.includes("_m.")
    ) {
      images.push(src);
    }
  });

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
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

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img").each((_, el) => {
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-original");
    if (
      src &&
      src.startsWith("http") &&
      !src.includes("logo") &&
      !src.includes("icon")
    ) {
      images.push(src);
    }
  });

  const sourceName = url.includes("24h")
    ? "24h.com.vn"
    : url.includes("bongdaplus")
      ? "Bongdaplus.vn"
      : "News";

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
    sourceUrl: url,
    sourceName,
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

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo")) {
      images.push(src);
    }
  });

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
    sourceUrl: url,
    sourceName: detectSourceName(url),
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

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  return {
    title,
    heroImage,
    description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs,
    images,
    sourceUrl: url,
    sourceName: detectSourceName(url),
  };
}

// --- Shared Vietnamese extractor helper (DRY for dantri, vietnamnet, tuoitre, thanhnien) ---

function extractVietnameseGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  containerSelectors: string,
  sourceName: string,
  opts?: { sapoSelector?: string }
): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $(containerSelectors).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  // Extract sapo/lead text
  if (opts?.sapoSelector) {
    const sapo = $(opts.sapoSelector).first().text().trim();
    if (sapo && sapo.length > 20) paragraphs.push(sapo);
  }

  // Extract paragraphs + figcaptions (some VN sites use figcaption for article text)
  container.find("p, figcaption").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
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

function extractZnews($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // znews.vn uses .the-article-body as primary container (verified via DevTools)
  const container = $(
    ".the-article-body, .article-content, article, [role=main]"
  ).first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  // Extract lead/sapo text
  const sapo = $(".the-article-summary").first().text().trim();
  if (sapo && sapo.length > 20) paragraphs.push(sapo);

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  // Build htmlContent for rich inline rendering if container has figures
  const figureCount = container.find("figure").length;
  const htmlContent = figureCount > 0
    ? sanitize(container.html() || "", ARTICLE_SANITIZE_OPTS)
    : undefined;

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

  // Extract lead/sapo text
  const sapo = $("p.description").first().text().trim();
  if (sapo && sapo.length > 20 && sapo !== description) {
    paragraphs.push(sapo);
  }

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20 && !paragraphs.includes(text)) paragraphs.push(text);
  });

  container.find("img, figure img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      if (!images.includes(src)) images.push(src);
    }
  });

  return {
    title, heroImage, description,
    publishedAt: extractPublishedAt($),
    author: extractAuthor($),
    paragraphs, images,
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

      // 1. Try Readability first (works best for English sites)
      const readable = await extractWithReadability(html, url);
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

        return {
          title: readable.title,
          heroImage: $('meta[property="og:image"]').attr("content"),
          description: readable.excerpt?.replace(/\.{2,}$/, "") || undefined,
          publishedAt: extractPublishedAt($),
          author: readable.byline ?? extractAuthor($),
          paragraphs,
          htmlContent: readable.htmlContent,
          images: [],
          sourceUrl: url,
          sourceName: detectSourceName(url),
          readingTime: estimateReadingTime(readable.textContent),
        };
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
