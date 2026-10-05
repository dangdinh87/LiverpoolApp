// Text hygiene for feed titles / snippets / descriptions. Pure, no server-only.
import * as cheerio from "cheerio";

const MAX_DECODE_PASSES = 3;

/**
 * Decode HTML entities until the text is stable (max 3 passes): feeds are
 * routinely double-escaped (`&amp;apos;` -> `&apos;` -> `'`, vietnamnet) and
 * some leave Latin-1 names undecoded (`&igrave;` in thanhnien). Tags, if any,
 * are dropped: a title/snippet is plain text.
 */
export function decodeHtmlEntities(value: string): string {
  let text = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    if (!/[&<]/.test(text)) break;
    const next = cheerio.load(text, null, false).text();
    if (next === text) break;
    text = next;
  }
  return text;
}

/** Entity-decode, drop control chars, collapse whitespace, trim, NFC. */
export function cleanFeedText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decodeHtmlEntities(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFC");
}

// WordPress feeds: "The post <title> appeared first on <Site>."
const APPEARED_FIRST = /\s*The (?:post|article)\s[\s\S]{0,400}?\sappeared first on\s[^.]{0,80}\.?\s*$/i;
// Yoast meta description (Anfield Index): "<title> written on October 4, 2026 by <Name>. This article is about <tags>."
const WRITTEN_ON = /\s*written on [A-Z][a-z]+ \d{1,2}, \d{4}(?: by [^.]{1,80})?\.?(?:\s*This article is about [^.]*\.?)?\s*$/i;

/** Remove CMS boilerplate that feeds append to snippets / descriptions. */
export function stripSnippetBoilerplate(value: string): string {
  return value.replace(APPEARED_FIRST, "").replace(WRITTEN_ON, "").trim();
}

/** Clean + boilerplate-free snippet, capped so a full-body `content` cannot bloat rows. */
export function cleanSnippet(value: unknown, max = 600): string {
  const text = stripSnippetBoilerplate(cleanFeedText(value));
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
