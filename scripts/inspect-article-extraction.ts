/**
 * Print what the article extractor makes of a live URL.
 *
 * This was previously `extractor-sandbox.test.ts`: nine hard-coded Vietnamese
 * news URLs, no assertions, and a console dump of each result. Because it
 * matched vitest's `src/**\/*.test.ts` include, every `npm run test` fired nine
 * live HTTP requests at third-party sites, which made the suite's runtime swing
 * between 4s and 11s and occasionally time out. Eyeballing extractor output for
 * a URL is a useful thing to do — it is just not a test, so it lives here.
 *
 *   npx tsx scripts/inspect-article-extraction.ts <url> [<url> ...]
 *
 * Per-source selector coverage is asserted offline in
 * src/lib/news/enrichers/__tests__/ — add cases there, not here.
 */
import { scrapeArticle } from "../src/lib/news/enrichers/article-extractor";

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error("usage: npx tsx scripts/inspect-article-extraction.ts <url> [<url> ...]");
    process.exit(1);
  }

  for (const url of urls) {
    console.log(`\n=== ${url} ===`);
    try {
      console.log(JSON.stringify(await scrapeArticle(url), null, 2));
    } catch (err) {
      console.error("failed:", err);
    }
  }
}

void main();
