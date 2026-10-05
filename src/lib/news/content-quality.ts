import type { ArticleContent } from "./types";

const BOT_CHALLENGE_TEXT =
  /javascript is (?:disabled|required)|enable javascript|verify (?:that )?you(?:'re| are) (?:a )?human|not a robot|checking your browser|just a moment\.\.\./i;

/**
 * Cached extractions that are really a scraped page shell: a pile of images and
 * (almost) no sentences. Anfield Index rows were stored like this (site menu +
 * every image on the page), and the reader rendered them — "way too many
 * images". Treat them as missing so the page re-scrapes or falls back to the
 * link-out view. Also: a stored bot-check page or an extraction with nothing in it.
 * Exported for tests.
 */
export function looksLikeJunkContent(content: ArticleContent): boolean {
  const paragraphs = (content.paragraphs ?? []).filter((p) => p.trim().length > 40).length;
  const html = content.htmlContent ?? "";
  const imgTags = (html.match(/<img\b/gi) ?? []).length;
  const images = Math.max(content.images?.length ?? 0, imgTags);
  if (paragraphs < 3 && images > 6) return true;
  // Whole-page HTML next to a one-line body: menus, sign-in links, footers.
  if (paragraphs < 3 && html.length > 10_000) return true;
  if (paragraphs < 3) {
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    // A cached bot-check page ("JavaScript is disabled… verify you are not a robot").
    if (BOT_CHALLENGE_TEXT.test(text) || (content.paragraphs ?? []).some((p) => BOT_CHALLENGE_TEXT.test(p))) return true;
    // Nothing at all: no sentence, no picture, no video, a few words of markup.
    if (paragraphs === 0 && images === 0 && !content.videoUrl && !html.includes("article-video-player") && text.length < 200) return true;
  }
  return false;
}
