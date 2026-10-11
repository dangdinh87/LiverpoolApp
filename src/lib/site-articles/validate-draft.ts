import type { ArticleFacts, SiteArticleContent } from "./types";

/**
 * Check a generated draft against the facts it was given.
 *
 * This stands in for the human fact-check Google's guidance assumes. Nothing
 * else in the pipeline can catch an invented scoreline: the model is fluent, so
 * a wrong number reads exactly like a right one. Every figure and every name in
 * the draft must trace back to the data the article was built from, or the
 * draft does not publish.
 *
 * It is deliberately strict and deliberately dumb — no model, no network, no
 * judgement calls. A rejected draft costs one generation; a published falsehood
 * costs the site's credibility.
 */

export interface ValidationReport {
  ok: boolean;
  problems: string[];
}

/** Minutes and halves exist whether or not the data mentions them. */
const STRUCTURAL_NUMBERS = new Set([0, 1, 2, 45, 90, 100]);

/**
 * Things no dataset can show. The site has numbers, not eyes and not access:
 * it did not watch the match, and nobody gave it a quote.
 */
const UNSUPPORTABLE = [
  { pattern: /\batmosphere\b|\bcrowd\b|\broar|\bdeafening\b|\belectric\b|\bbầu không khí\b|\bcổ động viên gào\b/i, why: "describes the atmosphere" },
  { pattern: /\bsaid\b|\btold\b|\bspoke\b|\binsisted\b|\bclaimed\b|\bphát biểu\b|\bchia sẻ\b|\bnói rằng\b/i, why: "reports speech" },
  { pattern: /\bdressing room\b|\bbehind the scenes\b|\bphòng thay đồ\b/i, why: "claims inside knowledge" },
  { pattern: /\bwill (?:surely|certainly)\b|\bis set to\b|\bexpected to sign\b|\bsắp chiêu mộ\b/i, why: "predicts transfers or outcomes" },
  { pattern: /\bdeserved\b|\bunlucky\b|\brobbed\b|\bxứng đáng hơn\b/i, why: "passes a judgement the data cannot support" },
];

/**
 * Words that open a sentence or heading without naming anyone.
 *
 * English capitalises the first word of every sentence, so position alone
 * cannot tell a name from grammar. Anything here is read as grammar; anything
 * else in that position still has to be in the facts. The list errs towards
 * being generous: a missing ordinary word rejects an honest draft, which costs
 * a regeneration, while an extra one only lets a name through in the one
 * position where it is least likely to be invented.
 */
const SENTENCE_STARTERS = new Set(
  (
    // articles, conjunctions, prepositions
    "the a an and but or so yet for nor as at by in into of on onto to from with without " +
    "within over under above below between among against during before after since until " +
    "while when where why how what which who whom whose whether if unless although though " +
    "because despite besides beyond across through about around " +
    // pronouns and determiners
    "he she it they them his her its their we us our you your i me my this that these those " +
    "there here both all each every any some none most more less fewer many much other another " +
    "either neither such same own " +
    // common verbs and adverbs that open sentences
    "is are was were be been being has have had do does did will would can could should may " +
    "might must let make made take took get got go goes went come came keep kept put set " +
    "not no yes also then now today still again just only even once twice always never often " +
    "finally meanwhile however therefore instead overall still already soon later early late " +
    // football vocabulary that is not a name
    "goal goals goalkeeper match matches game games half halves minute minutes second seconds " +
    "win wins won loss losses lose lost draw draws drawn result results score scores scored " +
    "shot shots target possession corner corners card cards penalty penalties substitute " +
    "league table position points played form season squad side sides team teams player " +
    "players manager striker defender midfielder forward captain kick off start end full " +
    "first next last previous final home away " +
    // Counting words open sentences too ("Three of the four goals came...").
    "one two three four five six seven eight nine ten eleven twelve " +
    "once twice half double single none nobody everyone " +
    "booking bookings lineup line-up kick-off half-time full-time stoppage injury " +
    "winner equaliser equalizer opener header assist assists clean sheet possession " +
    "report summary numbers stats statistics takeaways verdict context " +
    // Verbs a headline uses. This list is grown from recorded rejections, not
    // guessed: every draft turned away stores the exact word that did it, so
    // an ordinary word missing here shows up as a reject_reason and gets added.
    "give gives gave given take takes took get gets got put puts make makes made " +
    "seal seals sealed settle settles settled earn earns earned claim claims claimed " +
    "secure secures secured end ends ended leave leaves left send sends sent " +
    "keep keeps kept hold holds held beat beats beaten edge edges hit hits " +
    "see sees saw show shows showed say says tell tells turn turns move moves " +
    "stay stays sit sits go goes come comes run runs play plays played " +
    // Vietnamese opens sentences with ordinary words too, and the model writes
    // the Vietnamese article from the same facts.
    "và nhưng rồi thì là của cho với từ đến trong ngoài trên dưới sau trước khi " +
    "này đó đây kia các những một hai ba bốn năm sáu bảy tám chín mười cả mọi " +
    "đội bàn hiệp phút trận kết quả tỷ số thắng thua hòa bảng điểm vòng sân nhà " +
    "khách cầu thủ huấn luyện viên thẻ vàng đỏ phạt góc dứt điểm cầm bóng " +
    "có không được bị đã sẽ đang vẫn còn chỉ cũng rất khá hơn nhất " +
    "tuyến vị trí lượt mùa giải chung cuộc tổng cộng trước sau giữa " +
    // Words Vietnamese headings are built from.
    "bối cảnh diễn biến tình huống nhận định thống kê số liệu đội hình " +
    "ghi phút hiệp thẻ phạt thắng thua hoà hòa dẫn gỡ ấn định mở tỉ " +
    "chủ đối thủ sân vận động bàn thắng pha bóng lối chơi thế trận " +
    "tính nghĩa đây đó vậy nên bởi do vì nhờ dù tuy song ngoài riêng " +
    "theo như về cùng giữa suốt qua tới sang lại thêm nữa hầu gần khoảng " +
    // The voice addresses the reader as "bạn"; "level" opens an English one.
    "bạn mình chúng ta level even ahead behind clear late early overall " +
    "nửa phần đoạn khúc quãng lúc thời điểm"
  ).split(" "),
);

/** Collect every number and every proper noun the facts permit. */
function allowedFrom(facts: ArticleFacts): { numbers: Set<number>; names: Set<string> } {
  const numbers = new Set<number>(STRUCTURAL_NUMBERS);
  // The club this site is about, by the names its supporters use. Safe to allow
  // outright: they cannot be mistaken for another team.
  const names = new Set<string>([
    "reds", "kop", "liverpool", "anfield", "lfc",
    // The clock's zone, which the kick-off timestamp carries.
    "utc", "gmt",
  ]);

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === "number" && Number.isFinite(value)) {
      numbers.add(value);
      return;
    }
    if (typeof value === "string") {
      // A date is in the facts as an ISO string, but a writer renders it as
      // "20 September 2026". The day, month and year are all stated by the
      // data; only their spelling differs, so permit every form of them.
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (iso) {
        const [, year, month, day] = iso;
        numbers.add(Number(year));
        numbers.add(Number(month));
        numbers.add(Number(day));
        const at = new Date(value);
        // The month and the weekday are both stated by the date; only their
        // spelling differs, so every spelling of them is permitted.
        for (const locale of ["en-GB", "vi-VN"]) {
          for (const part of ["long", "short"] as const) {
            for (const options of [{ month: part }, { weekday: part }] as const) {
              names.add(
                new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" })
                  .format(at)
                  .toLowerCase()
                  .replace(/[^\p{L}]/gu, ""),
              );
            }
          }
        }
      }
      // Stored as word tokens, because a draft may use any part of a name
      // ("Manchester City" or just "City"). Tokens, not substrings: matching
      // substrings let "Darwin" through on the strength of result: "win".
      for (const word of value.toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
        if (word.length > 1) names.add(word);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") Object.values(value as object).forEach(walk);
  };
  walk(facts);

  // Totals and margins follow from the scores, so a draft may state them.
  const scores = [...numbers].filter((n) => Number.isInteger(n) && n >= 0 && n <= 20);
  for (const a of scores) {
    for (const b of scores) {
      numbers.add(a + b);
      if (a >= b) numbers.add(a - b);
    }
  }
  return { numbers, names };
}

/**
 * Whether a word in the draft names something the facts contain.
 *
 * A shortening of a name that IS in the data counts: the feed says "Manchester
 * City" and every writer on earth says "Man City". Only a prefix is allowed,
 * and only from three letters up, so an invented name cannot pass by being
 * vaguely similar — "Darwin" prefixes nothing in a Liverpool team sheet.
 */
function isKnownToken(token: string, names: Set<string>, numbers?: Set<number>): boolean {
  if (names.has(token)) return true;
  // "57th" is the number 57 wearing a suffix; check it as one.
  const ordinal = /^(\d+)(st|nd|rd|th)$/.exec(token);
  if (ordinal && numbers) return numbers.has(Number(ordinal[1]));
  if (token.length < 3) return false;
  for (const known of names) {
    if (known.length > token.length && known.startsWith(token)) return true;
  }
  return false;
}

/**
 * Every number written in the draft.
 *
 * Ordinals count: "61st-minute" states a minute as surely as "61" does, and it
 * used to pass both checks — the word boundary stopped it being read as a
 * number, and the leading digit stopped it being read as a name.
 */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\b(\d+(?:[.,]\d+)?)(?:st|nd|rd|th)?\b/gi)].map((m) =>
    Number(m[1].replace(",", ".")),
  );
}

/**
 * Proper nouns written in the draft.
 *
 * The first word of a sentence is capitalised by grammar, not because it names
 * anyone, so it is only treated as a name when it is not an ordinary word.
 * Consecutive capitalised words are joined, so "Manchester City" is one name.
 */
function namesIn(text: string, headingLike = false, ordinary: Set<string> = new Set()): string[] {
  const found: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence.trim().split(/\s+/);
    let run: string[] = [];
    words.forEach((raw, index) => {
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}']+$/gu, "");
      const capitalised = /^\p{Lu}/u.test(word);
      // A heading in Title Case capitalises every word, so position carries no
      // information there; an invented name is still caught, because it is not
      // an ordinary word in any position.
      // A word the draft itself also writes in lower case is an ordinary word,
      // whatever it looks like here. That generalises what a hand-kept list of
      // vocabulary can only approximate: "Booked" in a heading is ordinary
      // because the body says "was booked", while an invented surname appears
      // capitalised everywhere or not at all.
      const lower = word.toLowerCase();
      const ordinaryOpener =
        (headingLike || index === 0) && (SENTENCE_STARTERS.has(lower) || ordinary.has(lower));
      if (capitalised && !ordinaryOpener) {
        run.push(word);
      } else {
        if (run.length) found.push(run.join(" "));
        run = [];
      }
    });
    if (run.length) found.push(run.join(" "));
  }
  return found;
}

/**
 * The draft's prose, one unit per field.
 *
 * Kept separate because the first word of each field opens a sentence
 * grammatically. Joined into one string, a heading with no full stop would run
 * into the next field and its opening word would read as a mid-sentence name.
 */
function draftUnits(draft: SiteArticleContent): { text: string; headingLike: boolean }[] {
  return [
    { text: draft.title, headingLike: true },
    { text: draft.excerpt, headingLike: false },
    { text: draft.metaTitle, headingLike: true },
    { text: draft.metaDescription, headingLike: false },
    ...draft.sections.flatMap((s) => [
      { text: s.heading, headingLike: true },
      { text: s.body, headingLike: false },
    ]),
  ].filter((unit) => unit.text && unit.text.trim().length > 0);
}

export function validateDraft(
  draft: SiteArticleContent,
  facts: ArticleFacts,
): ValidationReport {
  const problems: string[] = [];
  const { numbers, names } = allowedFrom(facts);

  if (draft.sections.length === 0) problems.push("draft has no sections");
  if (!draft.title.trim()) problems.push("draft has no title");

  const units = draftUnits(draft);
  const text = units.map((u) => u.text).join("\n");

  if (/https?:\/\/|www\./i.test(text)) {
    problems.push("draft links out; these articles cite the site's own data only");
  }

  for (const n of numbersIn(text)) {
    // A four-digit number is a year, which the kick-off date already carries.
    if (!numbers.has(n) && !(n >= 1892 && n <= 2100)) {
      problems.push(`number ${n} is not in the match data`);
    }
  }

  // Words the draft writes in lower case somewhere, collected before checking.
  const writtenLowerCase = new Set<string>();
  for (const unit of units) {
    for (const word of unit.text.split(/[^\p{L}\p{N}']+/u)) {
      if (word && word === word.toLowerCase() && word.length > 1) writtenLowerCase.add(word);
    }
  }

  for (const name of units.flatMap((u) => namesIn(u.text, u.headingLike, writtenLowerCase))) {
    // Every word of the name has to be accounted for. "Manchester City" passes
    // on two known tokens; "Darwin Nunez" fails on both of its own.
    const tokens = name
      .toLowerCase()
      // Possessives are grammar: "Gakpo's" names the same person as "Gakpo".
      // Replaced with a space, not removed, because a missing space in the
      // model's output glues the next word on ("Isak's57th-minute").
      .replace(/['’]s/g, " ")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1)
      // An article is never part of a name, wherever it sits in the run:
      // "The Reds" and "Với The Reds" name the same club.
      .filter((t) => t !== "the" && t !== "các" && t !== "những");
    // Nothing left to check once articles and single letters are removed —
    // Vietnamese opens sentences with one-letter words like "Ở", which are
    // grammar, not names.
    if (tokens.length === 0) continue;
    if (!tokens.every((t) => isKnownToken(t, names, numbers))) {
      problems.push(`"${name}" is not a name in the match data`);
    }
  }

  for (const { pattern, why } of UNSUPPORTABLE) {
    if (pattern.test(text)) {
      problems.push(`${why} — that cannot be seen in the data this article was built from`);
    }
  }

  return { ok: problems.length === 0, problems: [...new Set(problems)] };
}
