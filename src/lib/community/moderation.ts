/**
 * Bilingual (Vietnamese + English) profanity/abuse filter and multi-layer
 * anti-spam heuristics for community chat, forum posts, comments, and guest
 * display names.
 *
 * Pure TypeScript (no Node-only modules) so it runs identically on Node.js
 * and Cloudflare Workers (`workerd`).
 */

const ZERO_WIDTH_RE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Wrap every phrase inside explicit Unicode letter/digit lookarounds so short
// words never false-match inside valid football terms (e.g. "Arsenal", "Alonso", "London").
function wordPattern(phrases: readonly string[]): RegExp {
  const escaped = phrases.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
  );
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join("|")})(?![\\p{L}\\p{N}])`, "iu");
}

const PROFANITY_TERMS_VI = [
  "địt",
  "đụ",
  "đéo",
  "lồn",
  "cặc",
  "buồi",
  "con đĩ",
  "đĩ điếm",
  "chó đẻ",
  "óc chó",
  "óc lợn",
  "súc vật",
  "mất dạy",
  "câm mồm",
  "mẹ mày",
  "má mày",
  "bố mày",
  "cha mày",
  "tổ sư",
  "đm",
  "đmm",
  "dmm",
  "đkm",
  "dkm",
  "đcm",
  "dcm",
  "vcl",
  "vkl",
  "vl",
  "clgt",
  "cmm",
  "con mẹ mày",
  "thằng chó",
  "ngu lồn",
  "ngu vl",
  "xàm lồn",
  "nhảm lồn",
  "cái lồn",
  "con cặc",
  "củ cặc",
  "đầu buồi",
] as const;

const PROFANITY_TERMS_EN = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "arsehole",
  "dickhead",
  "cunt",
  "prick",
  "whore",
  "slut",
  "wanker",
  "twat",
  "retard",
  "retarded",
  "nigger",
  "nigga",
  "faggot",
  "kys",
  "kill yourself",
] as const;

const PROFANITY_RE = wordPattern([...PROFANITY_TERMS_VI, ...PROFANITY_TERMS_EN]);

// Asterisk / symbol masked evasion (`f*ck`, `sh*t`, `b*tch`, `c*nt`, `đ*t`, `l*n`, `c*c`).
const MASKED_PROFANITY_RE =
  /(?<![\p{L}\p{N}])(?:f[*_@#]+c?k|sh[*_@#]+t|b[*_@#]+tch|c[*_@#]+nt|đ[*_@#]+t|l[*_@#]+n|c[*_@#]+c)(?![\p{L}\p{N}])/iu;

// Brand-unique gambling/adult tokens can be matched as substrings (catches "kubet88vip", etc.).
const SPAM_BRAND_SUBSTRINGS = [
  "kubet",
  "jun88",
  "hi88",
  "new88",
  "f8bet",
  "shbet",
  "789bet",
  "8xbet",
  "fun88",
  "fb88",
  "188bet",
  "dafabet",
  "vn88",
  "go88",
  "sunwin",
  "rikvip",
  "hitclub",
  "b52club",
  "1xbet",
  "onlyfans",
] as const;

const SPAM_BRAND_WORDS = [
  "nhà cái",
  "nha cai",
  "cá cược",
  "ca cuoc",
  "cá độ",
  "ca do",
  "tài xỉu",
  "tai xiu",
  "nổ hũ",
  "no hu",
  "bắn cá",
  "ban ca",
  "xóc đĩa",
  "xoc dia",
  "lô đề",
  "lo de",
  "soi cầu",
  "soi cau",
  "kéo nhóm",
  "keo nhom",
  "tặng code",
  "khuyến mãi nạp",
  "rút tiền nhanh",
  "w88",
  "m88",
  "bk8",
  "porn",
  "jav",
  "xxx",
] as const;

const SPAM_SUBSTRINGS_RE = new RegExp(
  SPAM_BRAND_SUBSTRINGS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "iu",
);
const SPAM_KEYWORDS_RE = wordPattern(SPAM_BRAND_WORDS);

const SPAM_CONTACT_RE =
  /(?:zalo|tele(?:gram)?|inbox|ib|nhóm)\D{0,12}0\d{8,10}/iu;

const SPAM_URL_DOMAINS_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|zalo\.me|wa\.me|bit\.ly|tinyurl\.com|cutt\.ly)\/\S+/i;

const GUEST_URL_RE =
  /https?:\/\/\S+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+|\b[a-z0-9-]{2,}\.(?:bet|win|vip|club|xyz|cc|click)(?:\/\S*)?/iu;

const MEMBER_LINK_RE = /https?:\/\/\S+/gi;
const SHADY_MEMBER_DOMAIN_RE =
  /https?:\/\/(?:www\.)?[a-z0-9.-]*\.(?:bet|win|vip|club|xyz|cc|click)(?:\/|$|\s)/i;

const CHAR_FLOOD_RE = /(.)\1{6,}/u;
const WORD_FLOOD_RE = /(?<![\p{L}\p{N}])(\p{L}{2,})(?:\s+\1){4,}(?![\p{L}\p{N}])/iu;

const RESERVED_NAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "anfield daily",
  "system",
]);

function stripInvisibleAndControl(raw: string): string {
  return raw.replace(ZERO_WIDTH_RE, "").replace(CONTROL_CHARS_RE, "");
}

function buildMatchVariants(cleaned: string): string[] {
  const lower = cleaned.normalize("NFC").toLowerCase();
  // 1) Collapse 3+ stretched letters (`fuuuuck` -> `fuck`, `địtttt` -> `địt`).
  const stretched = lower.replace(/([\p{L}])\1{2,}/gu, "$1");
  // 2) Collapse punctuation-separated single/pair letters (`đ.ị.t`, `f-u-c-k`, `v_c_l`).
  const punctSeparated = stretched.replace(
    /(?<![\p{L}\p{N}])\p{L}(?:[._\-+|/]+\p{L}){1,11}(?![\p{L}\p{N}])/gu,
    (m) => m.replace(/[._\-+|/]+/g, ""),
  );
  // 3) Collapse 3+ space-separated single letters (`f u c k`, `v c l`).
  const spaceSeparated = punctSeparated.replace(
    /(?<![\p{L}\p{N}])\p{L}(?:\s+\p{L}){2,11}(?![\p{L}\p{N}])/gu,
    (m) => m.replace(/\s+/g, ""),
  );
  return [lower, stretched, punctSeparated, spaceSeparated];
}

function hasProfanity(cleaned: string): boolean {
  const variants = buildMatchVariants(cleaned);
  return variants.some((v) => PROFANITY_RE.test(v) || MASKED_PROFANITY_RE.test(v));
}

function hasGamblingOrAdSpam(cleaned: string): boolean {
  const variants = buildMatchVariants(cleaned);
  if (variants.some((v) => SPAM_SUBSTRINGS_RE.test(v) || SPAM_KEYWORDS_RE.test(v))) {
    return true;
  }
  const lower = variants[0];
  return SPAM_CONTACT_RE.test(lower) || SPAM_URL_DOMAINS_RE.test(lower);
}

function hasStructuralFloodSpam(
  cleaned: string,
  allowLinks: boolean,
  maxLineBreaks: number,
): boolean {
  if (allowLinks) {
    const links = cleaned.match(MEMBER_LINK_RE) ?? [];
    if (links.length > 1) return true;
    if (SHADY_MEMBER_DOMAIN_RE.test(cleaned)) return true;
    if (SPAM_URL_DOMAINS_RE.test(cleaned)) return true;
  } else {
    if (GUEST_URL_RE.test(cleaned)) return true;
  }

  if (CHAR_FLOOD_RE.test(cleaned)) return true;
  if (WORD_FLOOD_RE.test(cleaned)) return true;

  const lineBreaks = (cleaned.match(/\n/g) ?? []).length;
  if (lineBreaks > maxLineBreaks) return true;

  // Shouting heuristic: >= 20 letters with > 80% uppercase.
  const upperMatches = cleaned.match(/\p{Lu}/gu) ?? [];
  const lowerMatches = cleaned.match(/\p{Ll}/gu) ?? [];
  const letterCount = upperMatches.length + lowerMatches.length;
  if (letterCount >= 20 && upperMatches.length / letterCount > 0.8) {
    return true;
  }

  return false;
}

/** Normalised comparison fingerprint to detect near-duplicate spam floods. */
export function normalizeSpamFingerprint(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type ModerationResult =
  | { ok: true; text: string; fingerprint: string }
  | { ok: false; reason: "invalid_length" | "profanity" | "spam" };

export function moderateMessageContent(
  raw: string,
  opts?: { allowLinks?: boolean; minLen?: number; maxLen?: number; maxLineBreaks?: number },
): ModerationResult {
  const minLen = opts?.minLen ?? 2;
  const maxLen = opts?.maxLen ?? 300;
  const maxLineBreaks = opts?.maxLineBreaks ?? 3;
  const allowLinks = Boolean(opts?.allowLinks);

  const trimmed = stripInvisibleAndControl(raw).trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    return { ok: false, reason: "invalid_length" };
  }

  if (hasProfanity(trimmed)) {
    return { ok: false, reason: "profanity" };
  }

  if (hasGamblingOrAdSpam(trimmed) || hasStructuralFloodSpam(trimmed, allowLinks, maxLineBreaks)) {
    return { ok: false, reason: "spam" };
  }

  return {
    ok: true,
    text: trimmed,
    fingerprint: normalizeSpamFingerprint(trimmed),
  };
}

export type DisplayNameModerationResult =
  | { ok: true; name: string | null }
  | { ok: false; reason: "profanity" | "spam" };

/**
 * Normalise and moderate an optional user-supplied display name.
 * Empty / whitespace-only / single-char inputs resolve cleanly to `{ ok: true, name: null }`;
 * reserved system names, links, gambling terms, or profanity return `{ ok: false, reason }`.
 */
export function moderateDisplayName(raw: unknown): DisplayNameModerationResult {
  if (typeof raw !== "string") return { ok: true, name: null };

  const cleaned = stripInvisibleAndControl(raw)
    .replace(/[<>]/g, "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2) return { ok: true, name: null };
  const clamped = cleaned.slice(0, 32).trim();
  if (clamped.length < 2) return { ok: true, name: null };

  if (hasProfanity(clamped)) {
    return { ok: false, reason: "profanity" };
  }

  if (
    RESERVED_NAMES.has(clamped.toLowerCase()) ||
    hasGamblingOrAdSpam(clamped) ||
    GUEST_URL_RE.test(clamped) ||
    CHAR_FLOOD_RE.test(clamped)
  ) {
    return { ok: false, reason: "spam" };
  }

  return { ok: true, name: clamped };
}
