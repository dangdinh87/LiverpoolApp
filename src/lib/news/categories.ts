import type { ArticleCategory, NewsArticle } from "./types";

/**
 * Build a matcher from English terms (ASCII word boundaries) and Vietnamese terms
 * (Unicode-aware boundaries: `\b` cannot see "ờ" as a letter, so "trời" would
 * otherwise match "rời"). Either list may be empty.
 */
function rule(en: string, vi: string): RegExp {
  const parts: string[] = [];
  if (en) parts.push(`\\b(?:${en})\\b`);
  if (vi) parts.push(`(?<![\\p{L}\\p{N}])(?:${vi})(?![\\p{L}\\p{N}])`);
  return new RegExp(parts.join("|"), "iu");
}

// A real scoreline: 1-2 digits each side, not part of a longer dash chain, so
// formations ("4-3-3"), season years ("2026-27") and dates ("04-10-2026") are excluded.
// Only ever tested against the TITLE: a snippet routinely quotes old results.
const SCORELINE = new RegExp(
  "(?<![\\d–-])\\d{1,2}\\s*[-–]\\s*\\d{1,2}(?!\\s*[-–]\\s*\\d)(?!\\d)",
  "u"
);

/** How much of the snippet is read: the lead says what the story is, the tail wanders. */
const SNIPPET_CHARS = 200;

// Previews / predictions. Checked FIRST: "Dự đoán tỷ số Liverpool vs Arsenal" holds the
// match-report keyword "tỷ số", and a Vietnamese preview often leads with "Nhận định".
const PREVIEW_TITLE = new RegExp(
  "^\\s*(?:nhận định|dự đoán|soi kèo|soi)(?![\\p{L}\\p{N}])|dự đoán tỷ số|(?<![\\p{L}\\p{N}])(?:preview|prediction|predictions)(?![\\p{L}\\p{N}])",
  "iu"
);

const MATCH_REPORT = rule(
  "match report|post[- ]match|highlights|full[- ]?time|half[- ]?time|goals?\\s+and\\s+assists?",
  "kết quả|tường thuật|bàn thắng|hiệp [12]|tỷ số"
);

// Injuries. Before transfers ("injury… move to sign cover" is an injury story).
// "setback" and bare "out for" / "recover" are NOT here: "setback" is any bad result,
// "things to look out for" and "recover from a slow start" are not injuries.
const INJURY = rule(
  "injur\\w*|ruled out|sidelined|hamstring|calf|ankle|groin|thigh|knee|muscle|surgery|fitness (?:doubts?|concerns?|tests?|boost)|" +
    "out for (?:\\d+|several|weeks?|months?|the (?:season|rest|next))|recovery|scan",
  "chấn thương|nghỉ thi đấu|dính chấn|vắng mặt|hồi phục|dây chằng|gãy"
);

// Transfers. Bare "move/moving/depart" were too loose ("Iraola is moving Liverpool on",
// "Ward appointed … [departure]"); a verb counts only next to a transfer noun / the club.
// Vietnamese "rời" needs an object: "rời CLB / Liverpool / Anfield / đội bóng".
const TRANSFER = rule(
  "transfer\\w*|sign(?:s|ed|ing|ings)?|deals?|bids?|fees?|targets?|targeted|swap\\w*|loan\\w*|release clause|contracts?|extend\\w*|renewal|" +
    "moves? for|moves? to (?:sign|join|re-sign|land|bring)|depart(?:ure|s|ed|ing)? (?:from )?(?:liverpool|anfield|the club)|(?:leave|leaves|leaving|exit|exits) (?:liverpool|anfield|the club)",
  "chuyển nhượng|ký (?:hợp đồng|kết)|gia nhập|rời (?:clb|câu lạc bộ|liverpool|anfield|đội bóng|đội)|mượn|hợp đồng|chiêu mộ|bán(?!\\s+kết)|mua"
);

// Team news. "confirmed" alone is any confirmation ("Ward confirmed as director").
const TEAM_NEWS = rule(
  "team news|line-?ups?|squad list|starting xi|confirmed (?:line-?up|xi|team|squad)|(?:on|from) the bench|benched|(?:squad|team) selection",
  "đội hình|danh sách|xuất phát|dự bị|đội hình chính"
);

// Opinion / ratings. "player of" dropped: "player of the month" is an award announcement.
const OPINION = rule(
  "opinion|column|analysis|tactical|breakdown|verdict|ratings?|pundit",
  "đánh giá|chấm điểm|nhận định|bình luận|phân tích"
);

// Preview / analysis (text-level phrases; whole-title previews are caught earlier).
const ANALYSIS = rule(
  "preview|predicted|expect(?:s|ed|ing|ations?)?|how .+ could line|pre[- ]match|ones? to watch|key battle",
  "dự đoán|trước trận|nhận định trước"
);

export function categorizeArticle(article: NewsArticle): ArticleCategory {
  // NFC so decomposed Vietnamese diacritics (from some feeds) still match.
  const title = article.title.normalize("NFC");
  const text = `${title} ${(article.contentSnippet ?? "").slice(0, SNIPPET_CHARS)}`.normalize("NFC");

  if (PREVIEW_TITLE.test(title)) return "analysis";
  if (SCORELINE.test(title) || MATCH_REPORT.test(text)) return "match-report";
  if (INJURY.test(text)) return "injury";
  if (TRANSFER.test(text)) return "transfer";
  if (TEAM_NEWS.test(text)) return "team-news";
  if (OPINION.test(text)) return "opinion";
  if (ANALYSIS.test(text)) return "analysis";
  return "general";
}
