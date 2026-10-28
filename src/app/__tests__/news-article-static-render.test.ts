import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * d7b3bd4 (26 Oct 2026) moved the article scrape to `cache: "no-store"` so scraped
 * pages stop filling the R2 incremental cache. On an ISR page Next treats a no-store
 * fetch as "this page is dynamic" and, at runtime, throws "Page changed from static
 * to dynamic" — every article not yet stored in the DB answered 500 until the page
 * declared force-static (28 Oct 2026).
 */
const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

describe("news article page", () => {
  const page = read("src", "app", "[locale]", "news", "[...slug]", "page.tsx");

  it("is force-static, so the no-store scrape cannot turn the ISR page into a 500", () => {
    expect(page).toMatch(/export const dynamic = "force-static";/);
    expect(page).toMatch(/export const revalidate = \d+;/);
  });

  it("still scrapes with no-store, keeping scraped HTML out of the R2 cache", () => {
    const extractor = read("src", "lib", "news", "enrichers", "article-extractor.ts");
    const scrape = extractor.slice(extractor.indexOf("export const scrapeArticle"), extractor.indexOf("export const getOgImage"));
    expect(scrape).toContain('cache: "no-store"');
    expect(scrape).not.toMatch(/next:\s*\{\s*revalidate/);
  });
});
