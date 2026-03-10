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
    // Dynamic import to avoid ESM/CJS incompatibility with jsdom on Vercel
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
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
  return sanitize(html, { allowedTags: [] });
}
