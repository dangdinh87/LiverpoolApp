import { Readability } from "@mozilla/readability";
import sanitize from "sanitize-html";

const SANITIZE_OPTS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat([
    "img", "figure", "figcaption", "h1", "h2", "h3", "h4",
  ]),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    img: ["src", "alt", "width", "height", "loading"],
  },
  allowedSchemes: ["https", "http"],
};

export interface ReadabilityResult {
  title: string;
  htmlContent: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  length: number;
}

export async function extractWithReadability(
  html: string,
  url: string
): Promise<ReadabilityResult | null> {
  try {
    // linkedom, not jsdom: jsdom does not run on Cloudflare Workers (workerd).
    // linkedom's document has no URL of its own, so a <base> lets Readability
    // resolve relative links and image paths against the article URL.
    const { parseHTML } = await import("linkedom");
    const withBase = /<base\s/i.test(html)
      ? html
      : html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}<base href="${url.replace(/"/g, "&quot;")}">`);
    const { document } = parseHTML(withBase);
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();
    if (!article || (article.length ?? 0) < 200) return null;

    return {
      title: article.title ?? "",
      htmlContent: sanitize(article.content ?? "", SANITIZE_OPTS),
      textContent: article.textContent ?? "",
      excerpt: article.excerpt ?? "",
      byline: article.byline ?? null,
      length: article.length ?? 0,
    };
  } catch {
    return null;
  }
}

export function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Re-export for use in article-extractor
export function sanitizeText(html: string): string {
  return sanitize(html, { allowedTags: [] })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}
