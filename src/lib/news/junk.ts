// Client-safe, dependency-free rules for "this is page furniture, not article".
// Shared by the server-side HTML cleaner (article-clean.ts) and the reader
// (components/news/news-text.ts re-exports these), so a rule added here covers
// freshly scraped articles, stored ones and the client pass alike.

const MIN_PARAGRAPH_CHARS = 12;

/** Lines that are promo/consent/navigation, matched against the whole paragraph. */
const JUNK_ANYWHERE: RegExp[] = [
  /FOLLOW\s+(OUR|US)\b/i,
  /FACEBOOK\s+PAGE/i,
  /\bIconSport\b/i,
  /\b(article|story) continues\b/i,
  /\bcontinue reading\b/i,
  /\ball the latest\b.*\b(news|page)\b/i,
  /\bdedicated .* page\b/i,
  /\bappeared first on\b/i,
  /\ball rights reserved\b/i,
  /^\s*©/,
  /^\s*view \d+ images?\s*$/i,
  /^\s*(xem|view) (thêm )?(ảnh|images?|gallery)\s*$/i,
  // Publisher chrome that ends up inside a scraped container (Independent / Reach / LFC).
  /\bthank you for registering\b/i,
  /\bplease refresh the page\b/i,
  /\bopen full menu\b/i,
  /\b(bookmark popover|removed from bookmarks|close popover)\b/i,
  /\bwant to bookmark your favourite\b/i,
  /\balready a (member|subscriber)\?/i,
  /\bjoin our commenting forum\b/i,
  /\bensure our latest news\b/i,
  /\bmanage settings\b/i,
  /\b(?:enter your email|hit subscribe)\b/i,
  /\byour support helps us to tell the story\b/i,
];

/** Risky phrases: only junk when the line is short (a real sentence may contain "sign up"). */
const JUNK_WHEN_SHORT: { re: RegExp; max: number }[] = [
  { re: /^\s*(sign up|subscribe|join)\b|\b(newsletter|click here|download the app)\b/i, max: 140 },
  { re: /\b(we use cookies|cookies? (policy|settings|preferences)|accept (all )?cookies|your consent|privacy (policy|notice)|terms (of use|and conditions))\b/i, max: 200 },
  { re: /\b(getty images|imago|reuters|associated press|ảnh:|photo:|image:)/i, max: 90 },
  { re: /\b(advertisement|sponsored|quảng cáo)\b/i, max: 40 },
  // "(Image: Alex Livesey - Danehouse/Getty Images)": a photo credit left as a paragraph.
  { re: /\((?:image|photo|picture|pic)s?\s*:[^)]{2,120}\)\s*$/i, max: 360 },
  { re: /\b(?:add|make|set|choose|select)\b[^.]{0,60}\bpreferred sources?\b|\bpreferred sources? (?:on|in) google\b/i, max: 200 },
  // "14:51, 04 Oct 2026" / "18:35, 30 Sep 2026Updated 16:04, 02 Oct 2026".
  { re: /^\s*\d{1,2}[:.]\d{2},?\s+\d{1,2}\s+\p{L}{3,9}\.?\s+\d{4}(\s*(?:updated|published)?\s*\d{1,2}[:.]\d{2},?\s+\d{1,2}\s+\p{L}{3,9}\.?\s+\d{4})?\s*$/iu, max: 80 },
  // "Published 5 hours ago" / "Updated 12 Mar 2026".
  { re: /^\s*(published|updated|đăng|cập nhật)\b[^.]{0,40}(ago|trước|\d{4})\s*$/iu, max: 60 },
  // ESPN datelines: "Alex KirklandOct 1, 2026, 08:22 AM ET" / "Oct 1, 2026, 04:45 PM ET".
  { re: /\b\p{L}{3,9}\.? \d{1,2}, \d{4},? \d{1,2}:\d{2}\s?(?:am|pm)?(?:\s?[A-Z]{2,4})?\s*$/iu, max: 90 },
  // Video teaser captions: "Nicol believes Klopp is wrong for backing Wirtz (2:37)".
  { re: /\(\d{1,2}:\d{2}\)\s*$/, max: 160 },
  // "Transfers home page | Men's summer grades | Women's grades": a nav strip.
  { re: /^[^|]{2,50}(\|[^|]{2,50}){2,}$/, max: 200 },
  // Standalone module headings of "most read" rails and promo cards.
  { re: /^\s*(most popular|popular videos|trending( now)?|bulletin|recommended( for you)?|you may also like|more from .{1,30}|in case you missed it|support now|join today|sign in|log in|register|swipe for next article|try \d+ months? for free)\s*$/i, max: 40 },
  { re: /\b(follow|add) .{0,50}\b(on|to) (google|discover|facebook|instagram|threads|twitter|whatsapp|telegram)\b/i, max: 160 },
];

/** Lines that open with a navigation/credit marker. */
const JUNK_PREFIX =
  /^\s*(read (more|next|also)|related( articles?| stories)?|see also|more:|watch:|listen:|share( this)?|tags?|tác giả|nguồn|ảnh|đọc thêm|xem thêm|đọc tiếp|tin liên quan|bài liên quan|theo dõi|photo|image|video|credit|source|via)\s*[:：]?(\s|$)/i;

/** "By Jamie Jackson", "Bởi Minh Anh": short capitalised byline with no sentence punctuation. */
const BYLINE = /^\s*([Bb]y|[Bb]ởi)\s+\p{Lu}[\p{L}'.-]*(\s+\p{Lu}[\p{L}'.-]*){0,3}\s*$/u;

export function isJunkParagraph(p: string): boolean {
  const text = p.replace(/\s+/g, " ").trim();
  if (text.length < MIN_PARAGRAPH_CHARS) return true;
  if (JUNK_ANYWHERE.some((re) => re.test(text))) return true;
  if (BYLINE.test(text)) return true;
  // Prefix markers only count on short lines: "Source: …" credit vs a long real sentence.
  if (text.length <= 160 && JUNK_PREFIX.test(text)) return true;
  return JUNK_WHEN_SHORT.some(({ re, max }) => text.length <= max && re.test(text));
}

export function filterJunk(paragraphs: string[]): string[] {
  return paragraphs.filter((p) => !isJunkParagraph(p));
}

/**
 * Comparable identity of an image URL: file name without extension, resize
 * suffix (`-1200x800`), query and a leading `0_`/`1_` slot prefix. Two URLs
 * with the same key are the same photo served at different sizes. Image CDNs
 * that keep the transform in the last segment (`…/<id>/w=1920,h=1080,fit=…`)
 * are keyed by the segment before it, or every photo would look identical.
 */
export function imageKey(url: string | undefined | null): string {
  if (!url) return "";
  const segments = url.split("?")[0].split("/").filter(Boolean);
  let file = segments.pop() ?? "";
  if (/[=,]/.test(file) && segments.length > 1) file = segments.pop() ?? file;
  return file
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/-\d{2,4}x\d{2,4}$/i, "")
    .replace(/^\d+_/, "")
    .toLowerCase();
}

/**
 * URLs of pictures that are page furniture, never part of a story: social icons,
 * site logos/badges, avatars, sprites, tracking pixels, membership/promo banners,
 * vector artwork. Matched on the URL path (and alt text for "… Icon"/"… Badge").
 */
const JUNK_IMAGE_TOKEN =
  /(^|[/_.+-])(icons?|sprites?|logos?|avatars?|gravatar|badges?|favicons?|pixel|spacer|blank|placeholder|emoji|tracking|beacon|button|promos?|prompts?|membership|preferred-source|static-assets|columnists?|1x1)([/_.+-]|\d|$)/i;
const JUNK_IMAGE_ALT = /\b(icon|logo|badge|avatar)\s*$/i;

export function isJunkImage(url: string | undefined | null, alt?: string | null): boolean {
  if (!url) return true;
  if (/^data:/i.test(url)) return true;
  const [path, query = ""] = url.split("?");
  if (/\.svg$/i.test(path)) return true;
  if (JUNK_IMAGE_TOKEN.test(path)) return true;
  // Image proxies carry the real file name in a parameter (ESPN: combiner/i?img=/i/columnists/…jpg).
  let decoded = query;
  try {
    decoded = decodeURIComponent(query);
  } catch {
    // keep the raw query
  }
  if (/(?:^|[?&])(?:img|image|src|url)=[^&]*/i.test(decoded) && JUNK_IMAGE_TOKEN.test(decoded.replace(/&.*$/, ""))) return true;
  return !!alt && JUNK_IMAGE_ALT.test(alt.trim());
}
