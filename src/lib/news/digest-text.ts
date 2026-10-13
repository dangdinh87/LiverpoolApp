import { BRAND } from "@/lib/brand";
import type { DigestSection, DigestSeoArticle } from "./digest";

/**
 * The briefing is model output, and the model sometimes drops a space: "mùa2026/27",
 * "Iraola:7 trận", "cóảnh hưởng", "Liverpoolở", "dự bị.Ở". The page renders the string it is
 * given, so the repair lives here, applied where a digest is read (rows already stored) and
 * where one is generated (rows to come).
 *
 * Deliberately conservative: a missing space looks careless, but a space inside "VnExpress",
 * "McAllister", "20:30", "3.5" or a URL looks broken. Only joins that no correct text contains
 * are touched. A Vietnamese syllable glued to the one before it ("nghiệmở") is NOT repaired:
 * "làmở" is "làm ở" or "là mở" and only the reader can tell.
 */

const VI_LOWER =
  "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
const VI_UPPER = VI_LOWER.toUpperCase();
/** Vietnamese letters Spanish, French and Portuguese names do not use (no plain é, á, ã, õ ...). */
const VI_ONLY = "âầấậẩẫăằắặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữđạảẹẻẽịỉĩọỏụủũỵỷỹ";
/** Vowels carrying a tone mark. A syllable has exactly one, so two in a row are two syllables. */
const VI_TONED =
  "àáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ";

const VOWEL = `aeiouy${VI_LOWER.replace("đ", "")}`;
const LOWER = `a-z${VI_LOWER}`;
const UPPER = `A-Z${VI_UPPER}`;
const LETTER = `${LOWER}${UPPER}`;

/** Tokens that are URLs, domains or e-mail: their dots and colons are part of the address. */
const ADDRESS = /:\/\/|^www\.|@|[\w-]\.(?:com|net|org|co|uk|vn|io|tv)\b/i;

const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // "dự bị.Ở" · "Mr.Slot": a full stop after a lowercase letter or digit, then a capital that is
  // not the start of an acronym ("Next.JS" stays). Domains are skipped by ADDRESS.
  [new RegExp(`(?<=[${LOWER}0-9])\\.(?=[${UPPER}](?![${UPPER}]))`, "gu"), ". "],
  // "dự bị.ở": a lowercase letter only Vietnamese uses cannot belong to a domain.
  [new RegExp(`(?<=[${LOWER}0-9])\\.(?=[${VI_LOWER}])`, "gu"), ". "],
  // "đâu?Vì" · "thắng!Slot"
  [new RegExp(`(?<=[!?])(?=[${LETTER}0-9])`, "gu"), " "],
  // "Iraola,Slot" · "2026,Liverpool" · "Slot,7"; "1,5" and "1,000" are numbers and stay.
  [new RegExp(`,(?=[${LETTER}])`, "gu"), ", "],
  [new RegExp(`(?<=[${LETTER}]),(?=[0-9])`, "gu"), ", "],
  // "Tỷ số;Liverpool"; an HTML entity such as "&amp;" ends in ";" too.
  [new RegExp(`(?<!&[a-z]+);(?=[${LETTER}0-9])`, "gu"), "; "],
  // "Iraola:7 trận" · "Source:BBC"; "20:30" and "2:1" have a digit before the colon.
  [new RegExp(`(?<=[${LETTER}]):(?=[${LETTER}0-9])`, "gu"), ": "],
  // "mùa2026" · "Vòng12": a Vietnamese word, then digits. "U23", "v4", "mp3" have no accent.
  [new RegExp(`(?<![\\p{L}\\p{N}])([${LETTER}]*[${VI_LOWER}][${LETTER}]*)(?=\\d)`, "gu"), "$1 "],
  // "season2026": a lowercase English word, then a year.
  [/(?<![\p{L}\p{N}])([a-z]{3,})(?=(?:19|20)\d{2}(?!\d))/gu, "$1 "],
  // "90phút" · "7trận": digits, then a Vietnamese word of two letters or more ("500đ" stays).
  [new RegExp(`(?<=\\d)(?=[${LETTER}]+[${VI_LOWER}]|[${LETTER}]*[${VI_LOWER}][${LETTER}]+)`, "gu"), " "],
  // "cóảnh": two tone marks in a row cannot be one syllable. The same letter twice
  // ("mộộng") is a stutter, not two syllables: splitting it would only add a space to the typo.
  [new RegExp(`([${VI_TONED}])(?!\\1)(?=[${VI_TONED}])`, "giu"), "$1 "],
  // "sânở" · "épở" · "Frimpongở": "ở" is the word whose space goes missing most. One syllable
  // never holds a vowel, consonants, then "ở" ("mở", "thở", "trở" have no vowel before the
  // consonants), so this is two. "làmở" could be "là mở"; "làm ở" is far likelier.
  [new RegExp(`(?<=[${VOWEL}][bcdđfghjklmnpqrstvwxz]+)(?=ở)`, "giu"), " "],
  // "Liverpoolở": six ASCII letters never lead into a Vietnamese-only letter inside one syllable.
  [new RegExp(`(?<=[A-Za-z]{6})(?=[${VI_ONLY}])`, "gu"), " "],
  // "đáLiverpool": an accented lowercase letter, then a capital.
  [new RegExp(`(?<=[${VI_LOWER}])(?=[${UPPER}])`, "gu"), " "],
];

/** Insert the space a model dropped; see the file comment for what is and is not repaired. */
export function fixJoinedWords(text: string): string {
  return text.normalize("NFC").replace(/\S+/g, (token) => {
    if (ADDRESS.test(token)) return token;
    return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), token);
  });
}

/** The prompt once asked for "Liverpool Daily", a name this site never had. */
export function fixBrandName(text: string): string {
  return text.replaceAll("Liverpool Daily", BRAND.name);
}

/** Rows stored before a field existed may lack it: pass anything that is not text through. */
const fix = <V>(value: V): V =>
  (typeof value === "string" ? fixBrandName(fixJoinedWords(value)) : value) as V;
const mapAll = <V>(items: V[] | undefined | null, fn: (item: V) => V): V[] =>
  (Array.isArray(items) ? items.map(fn) : items) as V[];

function cleanSeoArticle(article: DigestSeoArticle): DigestSeoArticle {
  return {
    ...article,
    sourceName: fix(article.sourceName),
    badgeLabel: fix(article.badgeLabel),
    title: fix(article.title),
    metaTitle: fix(article.metaTitle),
    metaDescription: fix(article.metaDescription),
    excerpt: fix(article.excerpt),
    conclusion: fix(article.conclusion),
    body: mapAll(article.body, (section) => ({
      ...section,
      heading: fix(section?.heading),
      paragraphs: mapAll(section?.paragraphs, fix),
    })),
  };
}

function cleanSection(section: DigestSection): DigestSection {
  return {
    ...section,
    headline: fix(section.headline),
    body: fix(section.body),
    ...(section.seoArticle && { seoArticle: cleanSeoArticle(section.seoArticle) }),
  };
}

interface DigestText {
  title: string;
  summary: string;
  sections: DigestSection[];
  seoArticle?: DigestSeoArticle;
  seo_article?: DigestSeoArticle | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

/**
 * Every reader-facing string of a digest (a stored row or a freshly generated result),
 * with dropped spaces put back and the wrong site name replaced. Returns a copy.
 */
export function cleanDigestText<T extends DigestText>(digest: T): T {
  return {
    ...digest,
    title: fix(digest.title),
    summary: fix(digest.summary),
    sections: mapAll(digest.sections, cleanSection),
    ...(digest.seoArticle && { seoArticle: cleanSeoArticle(digest.seoArticle) }),
    ...(digest.seo_article && { seo_article: cleanSeoArticle(digest.seo_article) }),
    ...("seo_title" in digest && { seo_title: fix(digest.seo_title) }),
    ...("seo_description" in digest && { seo_description: fix(digest.seo_description) }),
  };
}
