// Server-only: scrapes individual article pages for full content
import "server-only";
import { cache } from "react";
import * as cheerio from "cheerio";

export interface ArticleContent {
  title: string;
  heroImage?: string;
  description?: string;
  paragraphs: string[];
  images: string[];
  sourceUrl: string;
  sourceName: string;
}

// ---------------------------------------------------------------------------
// Per-source extraction strategies
// ---------------------------------------------------------------------------

type Extractor = ($: cheerio.CheerioAPI, url: string) => ArticleContent;

const extractors: Record<string, Extractor> = {
  "liverpoolfc.com": extractLfcOfficial,
  "bbc.com": extractBBC,
  "bbc.co.uk": extractBBC,
  "theguardian.com": extractGuardian,
  "bongda.com.vn": extractBongda,
  "24h.com.vn": extractVietnamese,
  "bongdaplus.vn": extractVietnamese,
};

function extractLfcOfficial($: cheerio.CheerioAPI, url: string): ArticleContent {
  // LFC injects <style> tags inside headings — use og:title first
  const ogTitle = $('meta[property="og:title"]').attr("content")?.replace(/\s*[-|]\s*Liverpool FC$/i, "");
  const h1 = $("h1").first().clone();
  h1.find("style, script").remove();
  const title = ogTitle || h1.text().trim() || "Article";
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // LFC site uses Next.js — try __NEXT_DATA__ first for structured content
  const nextDataScript = $("#__NEXT_DATA__").html();
  const paragraphs: string[] = [];
  const images: string[] = [];

  if (nextDataScript) {
    try {
      const data = JSON.parse(nextDataScript);
      const body = data?.props?.pageProps?.data?.article?.body;
      if (Array.isArray(body)) {
        for (const block of body) {
          if (block.type === "paragraph" && typeof block.value === "string") {
            // Strip HTML tags from paragraph value
            const text = block.value.replace(/<[^>]+>/g, "").trim();
            if (text.length > 20) paragraphs.push(text);
          } else if (block.type === "image" && block.value?.url) {
            images.push(block.value.url);
          }
        }
      }
    } catch {
      // Fall through to cheerio extraction
    }
  }

  // Fallback: cheerio extraction from article body
  if (paragraphs.length === 0) {
    const container = $("article, .article-body, [data-testid='article-body'], main").first();
    container.find("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });
  }

  return { title, heroImage, description, paragraphs, images, sourceUrl: url, sourceName: "LiverpoolFC.com" };
}

function extractBBC($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // BBC uses article or [data-component='text-block'] for content
  const container = $("article").length > 0 ? $("article") : $("[role=main]");
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && !src.includes("placeholder")) {
      images.push(src);
    }
  });

  return { title, heroImage, description, paragraphs, images, sourceUrl: url, sourceName: "BBC Sport" };
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

  return { title, heroImage, description, paragraphs, images, sourceUrl: url, sourceName: "The Guardian" };
}

function extractBongda($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  const container = $("article").length > 0 ? $("article") : $(".detail-content, .cms-body, .entry-body, #main-content");
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    // Skip very short paragraphs and source attribution
    if (text.length > 20 && !text.startsWith("BongDa.com.vn")) {
      paragraphs.push(text);
    }
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http") && src.includes("media.bongda")) {
      images.push(src);
    }
  });

  return { title, heroImage, description, paragraphs, images, sourceUrl: url, sourceName: "Bongda.com.vn" };
}

function extractVietnamese($: cheerio.CheerioAPI, url: string): ArticleContent {
  const title = $("h1").first().text().trim();
  const heroImage = $('meta[property="og:image"]').attr("content");
  const description = $('meta[property="og:description"]').attr("content");

  // Generic Vietnamese news site extraction
  const container = $("article, .detail-content, .content-detail, .cms-body, .entry-body, #main-content, [role=main]").first();
  const paragraphs: string[] = [];
  const images: string[] = [];

  container.find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) paragraphs.push(text);
  });

  container.find("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
    if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
      images.push(src);
    }
  });

  const sourceName = url.includes("24h") ? "24h.com.vn" : url.includes("bongdaplus") ? "Bongdaplus.vn" : "News";
  return { title, heroImage, description, paragraphs, images, sourceUrl: url, sourceName };
}

// ---------------------------------------------------------------------------
// Generic fallback using og: tags
// ---------------------------------------------------------------------------

function extractGeneric($: cheerio.CheerioAPI, url: string): ArticleContent {
  return {
    title: $("h1").first().text().trim() || $('meta[property="og:title"]').attr("content") || "Article",
    heroImage: $('meta[property="og:image"]').attr("content"),
    description: $('meta[property="og:description"]').attr("content"),
    paragraphs: [],
    images: [],
    sourceUrl: url,
    sourceName: new URL(url).hostname,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const scrapeArticle = cache(async (url: string): Promise<ArticleContent | null> => {
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
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[article-scraper] ${res.status} for ${url}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Find matching extractor by hostname
    const hostname = new URL(url).hostname;
    let extractor: Extractor = extractGeneric;
    for (const [domain, fn] of Object.entries(extractors)) {
      if (hostname.includes(domain)) {
        extractor = fn;
        break;
      }
    }

    const content = extractor($, url);

    // Fallback: use og:image if no hero image extracted
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
      "[article-scraper] Failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
});

// ---------------------------------------------------------------------------
// OG Image extraction (lightweight — only fetches head/meta)
// ---------------------------------------------------------------------------

export const getOgImage = cache(async (url: string): Promise<string | undefined> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LiverpoolApp/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 86400 }, // Cache 24h — og:image rarely changes
    });
    clearTimeout(timeoutId);
    if (!res.ok) return undefined;

    // Only read first 50KB to find og:image quickly
    const reader = res.body?.getReader();
    if (!reader) return undefined;

    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Early exit if we found </head>
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const match = html.match(/property="og:image"\s+content="([^"]+)"/);
    return match?.[1];
  } catch {
    return undefined;
  }
});
