import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Google Search Console verifies ownership of anfielddaily.com by fetching this
 * file, and keeps re-checking it. A cleanup commit (d064a2a, 17 Oct 2026)
 * deleted it as "unused": nothing in the code imports it, yet without it the
 * property — and the Change of Address from liverpoolfcvn.blog — is lost.
 */
const FILE = "google583c5c945cf216b2.html";

describe("Search Console verification file", () => {
  it("is still served from public/", () => {
    const path = join(process.cwd(), "public", FILE);
    expect(existsSync(path), `public/${FILE} was removed`).toBe(true);
    expect(readFileSync(path, "utf8").trim()).toBe(`google-site-verification: ${FILE}`);
  });

  it("is skipped by the proxy, so the locale rewrite cannot turn it into a 404", () => {
    const proxy = readFileSync(join(process.cwd(), "src", "proxy.ts"), "utf8");
    expect(proxy).toContain(FILE.replace(".", "\\\\."));
  });

  it("is served at its .html URL on Workers, not redirected to the extensionless path", () => {
    // Workers Assets defaults to html_handling "auto-trailing-slash", which 307s
    // /google….html to /google…; the verification fetch must get a 200.
    const wrangler = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(wrangler).toMatch(/"assets":\s*\{[^}]*"html_handling":\s*"none"/);
  });
});
