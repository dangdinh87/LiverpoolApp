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
// Syndication / copyright tails appended by wire or partner feeds
const SYNDICATED_FOOTER = /\s*(?:Originally published|Syndicated|First published) (?:on|by|from|in) [^.]{2,80}\.?\s*$/i;
const COPYRIGHT_FOOTER = /\s*©\s*\d{4}\b[^.]*?(?:\.\s*All rights reserved\.?)?\s*$/i;
// Standalone or trailing CTA boilerplate ("Read more...", "Click here...", "Continue reading »")
const STANDALONE_CTA =
  /^\s*(?:read\s+(?:more|full\s+(?:story|article))|continue\s+reading|click\s+here(?:\s+to\s+read(?:\s+more)?)?|đọc\s+(?:thêm|tiếp)|xem\s+thêm)(?:\s*(?:\.{1,3}|…|[»›>:]))?\s*$/i;
const TRAILING_CTA =
  /(?:\s*[—–|-]\s*|\s+(?=(?:read\s+more|continue\s+reading|click\s+here)\s*(?:\.{2,}|…|[»›>]|$))|(?<=[.!?…])\s+)(?:read\s+(?:more|full\s+(?:story|article))|continue\s+reading|click\s+here(?:\s+to\s+read(?:\s+more)?)?|đọc\s+(?:thêm|tiếp)|xem\s+thêm)(?:\s*(?:\.{1,3}|…|[»›>]))?\s*$/i;
const BRACKET_ELLIPSIS = /\s*\[\s*(?:\.{2,}|…)\s*\]\s*$/;

/** Remove CMS boilerplate that feeds append to snippets / descriptions. */
export function stripSnippetBoilerplate(value: string): string {
  let out = value
    .replace(APPEARED_FIRST, "")
    .replace(WRITTEN_ON, "")
    .replace(SYNDICATED_FOOTER, "")
    .replace(COPYRIGHT_FOOTER, "")
    .replace(TRAILING_CTA, "")
    .trim();

  if (BRACKET_ELLIPSIS.test(out)) {
    const stem = out.replace(BRACKET_ELLIPSIS, "").trimEnd();
    out = stem ? `${stem}…` : "";
  }
  if (STANDALONE_CTA.test(out)) return "";
  return out;
}

/** Clean + boilerplate-free snippet, capped at word boundary so a full-body `content` cannot bloat rows. */
export function cleanSnippet(value: unknown, max = 600): string {
  const text = stripSnippetBoilerplate(cleanFeedText(value));
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
