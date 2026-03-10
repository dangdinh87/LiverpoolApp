import type { ArticleCategory, NewsArticle } from "./types";

const RULES: { pattern: RegExp; category: ArticleCategory }[] = [
  // Match reports (EN + VI)
  {
    pattern:
      /\d+\s*[-–]\s*\d+|match report|post[- ]match|highlights|full[- ]?time|half[- ]?time|goals?\s+and\s+assists?|kết quả|tường thuật|bàn thắng|hiệp [12]|tỷ số/i,
    category: "match-report",
  },
  // Transfers (EN + VI)
  {
    pattern:
      /transfer|sign(s|ed|ing)|deal|bid|fee|target|swap|move|depart|loan|release clause|contract|extend|renewal|chuyển nhượng|ký (hợp đồng|kết)|gia nhập|rời|mượn|hợp đồng|mục tiêu|chiêu mộ|bán|mua/i,
    category: "transfer",
  },
  // Injuries (EN + VI)
  {
    pattern:
      /injur(y|ed|ies)|out for|ruled out|sidelined|hamstring|knee|muscle|fitness doubt|setback|scan|recover|chấn thương|nghỉ thi đấu|dính chấn|vắng mặt|hồi phục|dây chằng|gãy/i,
    category: "injury",
  },
  // Team news (EN + VI) — before opinion/analysis so "lineup" wins over "predicted"
  {
    pattern:
      /team news|lineup|line-?up|squad list|starting xi|confirmed|bench|selection|đội hình|danh sách|xuất phát|dự bị|đội hình chính/i,
    category: "team-news",
  },
  // Opinion / ratings (EN + VI)
  {
    pattern:
      /opinion|column|analysis|tactical|breakdown|verdict|ratings?|player of|pundit|đánh giá|chấm điểm|nhận định|bình luận|phân tích/i,
    category: "opinion",
  },
  // Preview / analysis (EN + VI)
  {
    pattern:
      /preview|predicted|expect|how .+ could line|pre[- ]match|ones? to watch|key battle|dự đoán|trước trận|nhận định trước/i,
    category: "analysis",
  },
];

export function categorizeArticle(article: NewsArticle): ArticleCategory {
  const text = `${article.title} ${article.contentSnippet}`;
  for (const { pattern, category } of RULES) {
    if (pattern.test(text)) return category;
  }
  return "general";
}
