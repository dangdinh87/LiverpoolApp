import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The briefing is the largest body of original writing on the site — 90 of its
 * ~185 indexable English URLs — and every one of them was Vietnamese, because
 * the prompt was written in Vietnamese and asked for Vietnamese output. The
 * language a reader got had nothing to do with the URL they opened.
 *
 * This reads the source rather than calling the model: a generation costs money
 * and takes a minute, and the thing worth guarding is the instruction, not one
 * sample of the output. Verified once against the live model on 2026-10-13
 * ("Liverpool Daily — 13 October 2026", no diacritics anywhere).
 */
const SOURCE = readFileSync(join(process.cwd(), "src/lib/news/digest.ts"), "utf8");
const VIETNAMESE = /[ăâđêôơưĂÂĐÊÔƠƯ]|[àáạảãầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/;

/** Source with `//` and block comments dropped, so prose about the code is not mistaken for code. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Everything between the prompt's opening backtick and its terminator. */
function digestPrompt(): string {
  const start = SOURCE.indexOf("const DIGEST_SYSTEM_PROMPT = `");
  expect(start, "DIGEST_SYSTEM_PROMPT not found — did it get renamed?").toBeGreaterThan(-1);
  const end = SOURCE.indexOf("`;", start);
  return SOURCE.slice(start, end);
}

describe("digest prompt", () => {
  it("is written in English and asks for English", () => {
    const prompt = digestPrompt();
    const offending = prompt
      .split("\n")
      .filter((line) => VIETNAMESE.test(line))
      .slice(0, 5);
    expect(offending, `Vietnamese in the digest prompt:\n${offending.join("\n")}`).toEqual([]);
  });

  it("does not name one country's readership", () => {
    // It addressed "cộng đồng fan Liverpool Việt Nam", two repositionings out of date.
    expect(digestPrompt()).not.toMatch(/Việt Nam|Vietnam|Vietnamese fans/i);
  });

  it("has no reader-facing Vietnamese left in the fallbacks", () => {
    // normalizeSeoArticle filled empty model fields with Vietnamese strings —
    // and a conclusion still crediting "LFCVN".
    const afterPrompt = SOURCE.slice(SOURCE.indexOf("function normalizeSeoArticle"));
    const offending = afterPrompt
      .split("\n")
      .filter((line) => VIETNAMESE.test(line) && line.includes('"'))
      .slice(0, 5);
    expect(offending, `Vietnamese fallback copy:\n${offending.join("\n")}`).toEqual([]);
    // Only what ships: a comment may name the old brand, a string must not.
    expect(withoutComments(SOURCE)).not.toContain("LFCVN");
  });

  it("titles the briefing with the site's own name", () => {
    // The template said "Liverpool Daily", a name the site never had; readers saw it on 90 pages.
    const prompt = digestPrompt();
    expect(prompt).not.toContain("Liverpool Daily");
    expect(prompt).toContain('"title": "${BRAND.name} —');
  });

  it("takes the site URL from configuration, not a literal", () => {
    // Both the prompt and the stored record had the previous domain baked in.
    expect(SOURCE).not.toContain("liverpoolfcvn.blog");
    expect(SOURCE).toContain('getEnv("NEXT_PUBLIC_SITE_URL")');
  });
});
