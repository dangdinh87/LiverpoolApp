import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ArticleContent } from "./types";
import { imageKey, isJunkImage, isJunkParagraph } from "./junk";

/**
 * Last pass over extracted article HTML (and over rows stored by older
 * extractors): everything that is page furniture rather than story comes out.
 *
 * Why a shared pass: the per-source extractors pick a container that often
 * still wraps menus, share bars, bylines, "most read" rails, affiliate cards
 * and tracking/icon images. Anfield Index and Liverpoolfc.com articles reached
 * readers as a wall of 24px share icons blown up to column width. Cached rows
 * keep whatever the extractor of that day produced, so the reader (page) and the
 * extractor both run this — it is idempotent.
 */

/** Photos in one body: a hard cap, and no more than ~1 per 2 text blocks (min 3). */
export const MAX_BODY_IMAGES = 8;
/** Explicit width/height attributes below this are icons, avatars or pixels. */
const MIN_IMAGE_WIDTH = 120;
const MIN_IMAGE_HEIGHT = 80;

const REMOVE_TAGS =
  "script, style, noscript, nav, footer, form, button, svg, select, input, textarea, dialog, template, canvas, object, embed";

/** Class tokens of share bars, bylines, promo rails, comment widgets, "view N images" overlays. */
const FURNITURE_CLASS =
  /(^|[\s_-])(share\w*|social\w*|byline|breadcrumbs?|newsletter|promos?|related\w*|recommend\w*|outbrain|taboola|advert\w*|sponsor\w*|comments?|signup|subscribe|paywall|cookie|consent|login|membership|trending|most-?read|read-?more|also-?read|toolbar|imagecountlabel|tag_label)([\s_-]|$)/i;

const SHARE_LINK =
  'a[href*="sharer"], a[href*="twitter.com/share"], a[href*="twitter.com/intent"], a[href*="x.com/intent"], a[href*="wa.me/"], a[href*="api.whatsapp.com"], a[href*="linkedin.com/share"], a[href*="linkedin.com/feed"], a[href*="telegram.me/share"], a[href*="t.me/share"], a[href*="facebook.com/share"], a[href*="pinterest.com/pin/create"], a[href*="reddit.com/submit"], a[href^="mailto:"]';

/** Affiliate / betting modules: removed together with the heading and picture around them. */
const PROMO_MARKER =
  /\b(affiliate links?|commission on any sales|t&cs apply|begambleaware|gamble responsibly|gambling can be addictive)\b/i;

/** Any of these inside an element means it is a wrapper, not a single line of text. */
const BLOCKS = "p, div, ul, ol, li, figure, table, section, article, blockquote, h1, h2, h3, h4, h5, h6, header, main";
/** What is left of a share bar once its icons and links are gone ("Email", "WhatsApp"). */
const SOCIAL_LABEL = /^(facebook|twitter|x|email|e-mail|whatsapp|linkedin|telegram|reddit|pinterest|messenger|copy link|share|print|comments?)$/i;
const MEDIA = "img, video, iframe, source, .article-video-player";
const EMPTY_CANDIDATES =
  "p, div, span, li, ul, ol, a, figure, figcaption, section, blockquote, strong, em, b, i, u, h2, h3, h4, h5, h6, table, thead, tbody, tr, td, th, picture";

const squash = (s: string) => s.replace(/[\s​-‍⁠﻿ ]+/g, " ").trim();

type $Any = cheerio.Cheerio<AnyNode>;

/** A wrapper that holds real prose (2+ long paragraphs) must never be dropped by a class-name guess. */
function hasProse($: cheerio.CheerioAPI, el: $Any): boolean {
  let n = 0;
  el.find("p").each((_, p) => {
    if (squash($(p).text()).length >= 100) n += 1;
  });
  return n >= 2;
}

function textBlockCount($: cheerio.CheerioAPI, root: $Any): number {
  let n = 0;
  root.find("p, li, blockquote, h2, h3").each((_, el) => {
    if (squash($(el).text()).length >= 40) n += 1;
  });
  return n;
}

export interface CleanOptions {
  /** The photo the page shows above the headline: never repeated in the body. */
  heroImage?: string;
  maxImages?: number;
}

/** Share of an element's text that sits inside links (0..1). */
function linkShare($: cheerio.CheerioAPI, el: $Any): number {
  const total = squash(el.text()).length;
  if (total === 0) return 0;
  let linked = 0;
  el.find("a").each((_, a) => {
    linked += squash($(a).text()).length;
  });
  return linked / total;
}

interface CleanResult {
  html: string;
  /** Text of the blocks that were taken out, so the plain `paragraphs` list can drop the same lines. */
  removedText: string[];
  /** imageKey of every picture the HTML had and no longer has: the plain-text body must not bring them back. */
  droppedImageKeys: Set<string>;
}

function cleanArticle(html: string, opts: CleanOptions = {}): CleanResult {
  if (!html) return { html, removedText: [], droppedImageKeys: new Set() };
  const $ = cheerio.load(html, null, false);
  const root = $.root() as $Any;
  const removedText: string[] = [];
  const keysOfImages = () =>
    new Set(root.find("img").toArray().map((el) => imageKey($(el).attr("src") || $(el).attr("data-src"))).filter(Boolean));
  const keysBefore = keysOfImages();
  const drop = ($el: $Any) => {
    const text = squash($el.text());
    if (text.length >= 12) removedText.push(text.toLowerCase());
    $el.remove();
  };

  root.find(REMOVE_TAGS).remove();
  // A <header> carrying prose is a lead; menus and "Open full menu" bars are not.
  root.find("header").each((_, el) => {
    if (!hasProse($, $(el))) drop($(el));
  });
  // A factbox is worth keeping; a short or link-heavy <aside> is a promo/"more from" card.
  root.find("aside").each((_, el) => {
    const $el = $(el);
    const text = squash($el.text());
    if (text.length < 150 || linkShare($, $el) > 0.4) drop($el);
  });
  root.find("[class]").each((_, el) => {
    const $el = $(el);
    if (FURNITURE_CLASS.test($el.attr("class") ?? "") && !hasProse($, $el)) drop($el);
  });
  root.find(SHARE_LINK).remove();

  // "More stories" rails: cards that are a picture linking to another page plus a headline.
  // The rail is the widest ancestor holding 2+ such pictures and no prose of its own.
  const isTeaserImg = (img: AnyNode) => {
    const href = $(img).closest("a").attr("href") ?? "";
    return !!href && !href.startsWith("#") && !/\.(?:jpe?g|png|webp|gif|avif)(?:\?|$)/i.test(href);
  };
  root.find("a img").each((_, img) => {
    // Skip pictures that went away with a rail removed earlier in this loop.
    if (!isTeaserImg(img) || !$.contains($.root()[0], img)) return;
    let rail: $Any | null = null;
    for (let up = $(img).parent() as $Any; up.length && !up.is("body"); up = up.parent() as $Any) {
      const hasOwnProse = up.find("p").toArray().some((p) => squash($(p).text()).length >= 80);
      if (hasOwnProse) break;
      if (up.find("a img").toArray().filter(isTeaserImg).length >= 2) rail = up;
    }
    if (rail) drop(rail);
  });

  // Promo modules: grow from the marker line to the enclosing card, never into
  // an ancestor that also holds a lot of other text (that would be the article).
  root.find("p, div, li").each((_, el) => {
    const $el = $(el);
    if ($el.find(BLOCKS).length > 0) return;
    if (!PROMO_MARKER.test(squash($el.text()))) return;
    let target: $Any = $el;
    let targetLen = squash($el.text()).length;
    for (let parent = $el.parent() as $Any; parent.length && !parent.is("body"); parent = parent.parent() as $Any) {
      const parentLen = squash(parent.text()).length;
      if (parentLen > 700 || parentLen - targetLen > 400) break;
      // A full-length paragraph next to the marker means this wrapper is the article, not a card.
      const holdsProse = parent.find("p").toArray().some((p) => !$.contains(target[0], p) && squash($(p).text()).length >= 180);
      if (holdsProse) break;
      target = parent;
      targetLen = parentLen;
    }
    drop(target);
  });

  // Promo / consent / credit / timestamp lines, and paragraphs that are only a link list
  // ("- Related story - Other story": how ESPN splices "related" teasers into the body).
  // Twice: removing a junk child can leave its wrapper as a one-line leaf (consent placeholders).
  for (let pass = 0; pass < 2; pass++) {
    root.find("p, li, h2, h3, h4, h5, h6, div, span, a").each((_, el) => {
      const $el = $(el);
      if ($el.find(MEDIA).length > 0 || $el.find(BLOCKS).length > 0) return;
      const text = squash($el.text());
      if (!text) return;
      if (SOCIAL_LABEL.test(text)) {
        drop($el);
        return;
      }
      // Inline pieces of a sentence are never judged on their own.
      if ($el.is("span, a") && $el.parent().is("p, li, h1, h2, h3, h4, h5, h6, a, span, td, th, figcaption, strong, em, b, i")) return;
      // Short fragments are only junk as whole paragraphs ("Sport", "Share"); a one-word <h2> is a sub-heading.
      const junkLine = ($el.is("p") || text.length >= 12) && isJunkParagraph(text);
      const linkList =
        $el.is("p, li") && text.length >= 20 && linkShare($, $el) >= 0.95 && ($el.find("a").length >= 2 || text.length <= 140);
      if (junkLine || linkList) drop($el);
    });
  }

  // Lists made only of links: topic tags, "related" rails.
  root.find("ul, ol").each((_, el) => {
    const $el = $(el);
    if ($el.find(MEDIA).length > 0) return;
    const items = $el.children("li");
    if (items.length >= 2 && linkShare($, $el) >= 0.95) drop($el);
  });

  // Pictures: furniture by name/size, repeats of the hero or of an earlier photo, the cap.
  const heroKey = imageKey(opts.heroImage);
  const seen = new Set<string>(heroKey ? [heroKey] : []);
  const limit = Math.min(
    opts.maxImages ?? MAX_BODY_IMAGES,
    Math.max(3, Math.ceil(textBlockCount($, root) / 2)),
  );
  let kept = 0;
  root.find("img").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src") || $img.attr("data-src") || "";
    const w = parseInt($img.attr("width") ?? "", 10);
    const h = parseInt($img.attr("height") ?? "", 10);
    const key = imageKey(src);
    const skip =
      !src ||
      isJunkImage(src, $img.attr("alt")) ||
      (Number.isFinite(w) && w < MIN_IMAGE_WIDTH) ||
      (Number.isFinite(h) && h < MIN_IMAGE_HEIGHT) ||
      (!!key && seen.has(key)) ||
      kept >= limit;
    if (skip) {
      $img.remove();
      return;
    }
    if (key) seen.add(key);
    kept += 1;
  });
  // A figure left with only its caption is not a figure.
  root.find("figure").each((_, el) => {
    if ($(el).find(MEDIA).length === 0 && $(el).find("blockquote").length === 0) $(el).remove();
  });

  // Empty shells (zero-width spacers, wrappers whose content was removed), until stable.
  for (let pass = 0; pass < 6; pass++) {
    let removed = 0;
    root.find(EMPTY_CANDIDATES).each((_, el) => {
      const $el = $(el);
      // The video placeholder is an empty div on purpose: the reader mounts the player into it.
      if ($el.closest(".article-video-player").length > 0) return;
      if ($el.find(MEDIA).length === 0 && !squash($el.text())) {
        $el.remove();
        removed += 1;
      }
    });
    if (removed === 0) break;
  }

  const keysAfter = keysOfImages();
  const droppedImageKeys = new Set([...keysBefore].filter((k) => !keysAfter.has(k)));
  return { html: ($.html() ?? "").trim(), removedText, droppedImageKeys };
}

export function cleanArticleHtml(html: string, opts: CleanOptions = {}): string {
  return cleanArticle(html, opts).html;
}

/** Photos for the plain-text body: no furniture, no hero repeat, no duplicates, capped. */
export function cleanImageList(images: string[] | undefined, heroImage?: string, max = MAX_BODY_IMAGES): string[] {
  const seen = new Set<string>(heroImage ? [imageKey(heroImage)] : []);
  const out: string[] = [];
  for (const src of images ?? []) {
    const key = imageKey(src);
    if (!src || isJunkImage(src) || (key && seen.has(key))) continue;
    if (key) seen.add(key);
    out.push(src);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Cleaned copy of an extraction. Paragraphs keep their original list when
 * filtering would leave nothing (thin sources only have a description stand-in).
 */
export function cleanArticleContent(content: ArticleContent): ArticleContent {
  const cleaned = content.htmlContent ? cleanArticle(content.htmlContent, { heroImage: content.heroImage }) : undefined;
  const norm = (t: string) => t.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
  const removed = (cleaned?.removedText ?? []).map(norm);
  const paragraphs = content.paragraphs.filter((p) => {
    if (isJunkParagraph(p)) return false;
    const n = norm(p);
    return !(n.length >= 12 && removed.some((r) => r.includes(n)));
  });
  return {
    ...content,
    htmlContent: cleaned?.html || undefined,
    paragraphs: paragraphs.length > 0 ? paragraphs : content.paragraphs,
    // A photo the cleaner took out of the HTML (teaser rail, promo card) must not come back via the list.
    images: cleanImageList(content.images, content.heroImage).filter((src) => !cleaned?.droppedImageKeys.has(imageKey(src))),
  };
}
