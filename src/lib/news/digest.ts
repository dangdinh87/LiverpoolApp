import "server-only";
import { cache } from "react";
import { vietapi } from "@/lib/ai/vietapi";
import { generateText } from "ai";
import { getEnv } from "@/lib/env";
import { getServiceClient } from "./supabase-service";
import { describeDigestWindow } from "./digest-window";
import { analyzeArticleRelevance } from "./relevance";
import { buildCurrentFactsBlock } from "@/lib/prompts/current-facts";
import type { NewsArticle } from "./types";

const SEO_ARTICLE_SECTION_CATEGORY = "__seo_article__";

export interface DigestSection {
  category: string;
  categoryVi: string;
  headline: string;
  body: string;
  articleUrls: string[];
  seoArticle?: DigestSeoArticle;
  hidden?: boolean;
}

export interface DigestSeoSection {
  heading: string;
  paragraphs: string[];
}

export interface DigestSeoArticle {
  sourceName: string;
  sourceUrl: string;
  badgeLabel: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  body: DigestSeoSection[];
  conclusion: string;
}

export interface DigestResult {
  title: string;
  summary: string;
  sections: DigestSection[];
  seoArticle: DigestSeoArticle;
  articleCount: number;
  tokensUsed: number;
  model: string;
}

export interface DigestRecord {
  id: string;
  digest_date: string;
  title: string;
  summary: string;
  sections: DigestSection[];
  seo_title?: string | null;
  seo_description?: string | null;
  seo_article?: DigestSeoArticle | null;
  article_ids: string[];
  article_count: number;
  model: string;
  tokens_used: number;
  generated_at: string;
}

export const DIGEST_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function getDigestDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DIGEST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function formatDigestDateVi(date = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: DIGEST_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const CATEGORY_VI_MAP: Record<string, string> = {
  "match-report": "Kết Quả Trận Đấu",
  transfer: "Chuyển Nhượng",
  injury: "Chấn Thương",
  "team-news": "Tin Đội Bóng",
  analysis: "Phân Tích",
  opinion: "Quan Điểm",
  general: "Tin Tổng Hợp",
};

// Model fallback chain — try each model in order until one succeeds.
// Groq free tier has per-model daily token limits (TPD).
// The digest is a LARGE request (~7K tokens: long prompt + up to 25 articles).
// VietAPI prices flat per token with no per-minute cap to design around, so this
// is ordered by prose quality rather than by throughput limits.
// Verified live 2026-09-09.
const DIGEST_MODELS = [
  "deepseek-v4-flash", // default everywhere in the app: cheap, fast, clean diacritics
  "deepseek-v4-pro",   // step up if flash fails or returns bad JSON
  "claude-sonnet-5",   // last resort (slowest; long runs can exceed the 60s cron limit)
] as const;

const DIGEST_SYSTEM_PROMPT = `Bạn là một biên tập viên thể thao người Việt, đồng thời là fan cuồng nhiệt của Liverpool FC. Bạn viết bản tin hàng ngày cho cộng đồng fan Liverpool Việt Nam — giọng văn gần gũi, sôi nổi, như đang kể chuyện cho anh em fan cùng nghe.

Input: Danh sách bài báo gần đây kèm tiêu đề, tóm tắt, nguồn và danh mục.
Output: JSON object với cấu trúc:
{
  "title": "Liverpool Daily — {ngày tháng tiếng Việt}",
  "summary": "Tóm tắt 4-6 câu, giọng kể chuyện cuốn hút. Mở đầu bằng tin quan trọng nhất, tự nhiên chuyển tiếp sang các tin khác. Nhắc tên cầu thủ, tỉ số, chi tiết cụ thể.",
  "sections": [
    {
      "category": "category-key",
      "categoryVi": "Tên danh mục tiếng Việt",
      "headline": "Tiêu đề hấp dẫn bằng tiếng Việt, nhắc tên người/sự kiện chính",
      "body": "4-6 câu chi tiết. Kể chuyện có mạch lạc, có nhân vật, có bối cảnh. Kết hợp thông tin từ nhiều bài để cho bức tranh toàn cảnh.",
      "articleUrls": ["url1", "url2"]
    }
  ],
  "seoArticle": {
    "sourceName": "Liverpool FC Việt Nam",
    "sourceUrl": "https://www.liverpoolfcvn.blog",
    "badgeLabel": "LFCVN Pro",
    "title": "Tiêu đề bài báo chuẩn SEO bằng tiếng Việt, tự nhiên, có Liverpool",
    "metaTitle": "SEO title 50-60 ký tự",
    "metaDescription": "SEO meta description 140-160 ký tự, có từ khóa chính",
    "excerpt": "Đoạn sapo 2-3 câu, tóm lược giá trị bài viết.",
    "focusKeyword": "tin tức Liverpool",
    "secondaryKeywords": ["Liverpool FC", "tin Liverpool mới nhất", "The Reds"],
    "body": [
      {
        "heading": "H2 chứa ý chính",
        "paragraphs": ["2-3 đoạn văn chi tiết, mỗi đoạn 2-4 câu."]
      }
    ],
    "conclusion": "Kết bài có nhận định rõ ràng cho fan Liverpool."
  }
}

Phong cách viết:
- Giọng văn tự nhiên, có cảm xúc — như biên tập viên đang trò chuyện với fan, KHÔNG phải bản tin thông tấn khô khan
- Dùng câu chuyển tiếp mượt mà giữa các ý (thay vì liệt kê rời rạc kiểu "Ngoài ra...", "Bên cạnh đó...")
- Được phép thể hiện cảm xúc fan: hào hứng khi thắng, lo lắng khi chấn thương, kỳ vọng trước trận lớn
- Đặt tin trong bối cảnh rộng hơn (cuộc đua vô địch, phong độ gần đây, lịch sử đối đầu)
- Kết thúc summary bằng câu tạo kỳ vọng hoặc nhận định ngắn gọn

QUAN TRỌNG — Viết như người thật, TUYỆT ĐỐI tránh lộ chất AI:
- CẤM các cụm sáo rỗng kiểu AI: "Trong bối cảnh", "Đáng chú ý là", "Điều thú vị là", "Không thể phủ nhận", "Có thể nói rằng", "Nhìn chung", "Tóm lại", "Hơn bao giờ hết", "đánh dấu một bước ngoặt", "không chỉ... mà còn", "Hãy cùng chờ đợi", "Thời gian sẽ trả lời"
- ĐA DẠNG độ dài câu: xen câu ngắn gọn, dứt khoát với câu dài. KHÔNG để mọi câu cùng nhịp điệu đều đều
- KHÔNG mở đầu nhiều đoạn bằng cùng một kiểu (tránh lặp "Liverpool...", "The Reds...", "Đội bóng...")
- KHÔNG dùng dấu gạch ngang (—) tràn lan; ưu tiên dấu câu tự nhiên
- KHÔNG kết bài kiểu chung chung vô thưởng vô phạt; nêu quan điểm cụ thể, có lập trường của một fan thực thụ
- Dùng khẩu ngữ fan bóng đá Việt khi hợp lý: "The Kop", "lữ đoàn đỏ", "thầy trò Iraola", "đại chiến", "phong độ hủy diệt" — nhưng đừng nhồi nhét
- Viết như đang gõ nhanh cho anh em fan đọc, có chính kiến, hơi đời thường — KHÔNG trau chuốt máy móc, KHÔNG cân bằng giả tạo kiểu "một mặt... mặt khác"

Quy tắc nội dung:
- Nhắc TẤT CẢ tên cầu thủ, HLV quan trọng — KHÔNG được bỏ sót
- Gộp bài theo danh mục, bỏ danh mục không có bài
- Mỗi section tổng hợp 1-5 bài liên quan
- Giữ nguyên tên riêng tiếng Anh (Van Dijk, Wirtz, Arsenal, Iraola)
- Thuật ngữ: "clean sheet" = "giữ sạch lưới", "assist" = "kiến tạo", "hat-trick" giữ nguyên
- Nêu chi tiết cụ thể: tỉ số, thống kê, ngày tháng, trích dẫn khi có
- Nếu ít hơn 5 bài, viết dạng "Tin Nhanh" với 1-2 section nhưng vẫn chi tiết
- seoArticle phải là một bài báo riêng chuẩn SEO cho Liverpool, không chỉ lặp lại summary
- seoArticle dùng nguồn/publisher là "Liverpool FC Việt Nam" và giữ sourceUrl đúng như input
- seoArticle dài 600-900 từ, có sapo, 3-5 H2, chèn focusKeyword tự nhiên trong title/sapo/ít nhất 1 H2
- Không copy nguyên văn bài nguồn; chỉ tổng hợp, diễn giải lại và giữ attribution qua articleUrls ở sections
- Trả về CHỈ JSON hợp lệ — không markdown, không giải thích thêm`;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeSeoArticle(
  seoArticle: Partial<DigestSeoArticle> | undefined,
  parsed: { title: string; summary: string; sections: DigestSection[] },
  sourceUrl: string
): DigestSeoArticle {
  const fallbackBody = parsed.sections.map((section) => ({
    heading: section.headline || section.categoryVi || "Tin Liverpool đáng chú ý",
    paragraphs: [section.body].filter(Boolean),
  }));

  const rawBody = Array.isArray(seoArticle?.body) ? seoArticle.body : [];
  const body = rawBody
    .map((section) => ({
      heading: typeof section?.heading === "string" && section.heading.trim()
        ? section.heading.trim()
        : "Tin Liverpool đáng chú ý",
      paragraphs: asStringArray(section?.paragraphs),
    }))
    .filter((section) => section.paragraphs.length > 0);

  const title = seoArticle?.title?.trim() || parsed.title;
  const excerpt = seoArticle?.excerpt?.trim() || parsed.summary;
  const metaDescription =
    seoArticle?.metaDescription?.trim() || parsed.summary.slice(0, 160);

  return {
    sourceName: "Liverpool FC Việt Nam",
    sourceUrl,
    badgeLabel: seoArticle?.badgeLabel?.trim() || "LFCVN Pro",
    title,
    metaTitle: seoArticle?.metaTitle?.trim() || title.slice(0, 60),
    metaDescription,
    excerpt,
    focusKeyword: seoArticle?.focusKeyword?.trim() || "tin tức Liverpool",
    secondaryKeywords: asStringArray(seoArticle?.secondaryKeywords).slice(0, 8),
    body: body.length > 0 ? body : fallbackBody,
    conclusion:
      seoArticle?.conclusion?.trim() ||
      "Liverpool vẫn là tâm điểm chú ý của người hâm mộ, và những diễn biến mới nhất sẽ tiếp tục được LFCVN cập nhật sát sao.",
  };
}

function isDigestSeoArticle(value: unknown): value is DigestSeoArticle {
  if (!value || typeof value !== "object") return false;
  const article = value as Partial<DigestSeoArticle>;
  return (
    typeof article.title === "string" &&
    typeof article.metaDescription === "string" &&
    Array.isArray(article.body)
  );
}

export function getSeoArticleFromDigest(
  digest: Pick<DigestRecord, "sections" | "seo_article">
): DigestSeoArticle | null {
  if (isDigestSeoArticle(digest.seo_article)) return digest.seo_article;
  const section = digest.sections.find((item) => item.category === SEO_ARTICLE_SECTION_CATEGORY);
  return isDigestSeoArticle(section?.seoArticle) ? section.seoArticle : null;
}

export function getVisibleDigestSections(sections: DigestSection[]): DigestSection[] {
  return sections.filter((section) => section.category !== SEO_ARTICLE_SECTION_CATEGORY && !section.hidden);
}

function withSeoArticleSection(
  sections: DigestSection[],
  seoArticle: DigestSeoArticle
): DigestSection[] {
  return [
    ...getVisibleDigestSections(sections),
    {
      category: SEO_ARTICLE_SECTION_CATEGORY,
      categoryVi: "SEO Article",
      headline: seoArticle.title,
      body: seoArticle.excerpt,
      articleUrls: [],
      seoArticle,
      hidden: true,
    },
  ];
}

function isMissingSeoColumnError(error: { message?: string } | null): boolean {
  return !!error?.message && /seo_article|seo_title|seo_description|schema cache/i.test(error.message);
}

function buildDigestPayload(
  existing: DigestRecord | null,
  digestDate: string,
  digest: DigestResult,
  generatedAt: string,
  includeSeoColumns: boolean
): Record<string, unknown> {
  const visibleSections = getVisibleDigestSections(digest.sections);
  return {
    ...(existing || {}),
    digest_date: digestDate,
    title: digest.title,
    summary: digest.summary,
    sections: withSeoArticleSection(visibleSections, digest.seoArticle),
    ...(includeSeoColumns && {
      seo_title: digest.seoArticle.metaTitle,
      seo_description: digest.seoArticle.metaDescription,
      seo_article: digest.seoArticle,
    }),
    article_ids: visibleSections.flatMap((s) => s.articleUrls),
    article_count: digest.articleCount,
    model: digest.model,
    tokens_used: digest.tokensUsed,
    generated_at: generatedAt,
  };
}

export async function upsertDigestRecord(
  existing: DigestRecord | null,
  digestDate: string,
  digest: DigestResult,
  generatedAt = new Date().toISOString()
): Promise<DigestRecord | null> {
  const supabase = getServiceClient();
  const payload = buildDigestPayload(existing, digestDate, digest, generatedAt, true);
  const { data, error } = await supabase
    .from("news_digests")
    .upsert(payload, { onConflict: "digest_date" })
    .select("*")
    .maybeSingle();

  if (!error) return data;
  if (!isMissingSeoColumnError(error)) throw error;

  console.warn("[digest] SEO columns missing; storing SEO article inside sections JSONB.");
  const fallbackPayload = buildDigestPayload(existing, digestDate, digest, generatedAt, false);
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("news_digests")
    .upsert(fallbackPayload, { onConflict: "digest_date" })
    .select("*")
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return fallbackData;
}

/** Article fields the digest prompt needs. */
export interface DigestSourceArticle {
  url: string;
  title: string;
  snippet: string | null;
  source: string;
  language: string;
  category: string;
  relevance?: number | null;
}

const DIGEST_ARTICLE_LIMIT = 25;

// Fetch the top relevant active articles within the last `windowHours`.
// Matches on either publish time or sync time so freshly-synced items count.
async function fetchDigestArticles(
  supabase: ReturnType<typeof getServiceClient>,
  windowHours: number
): Promise<DigestSourceArticle[]> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("articles")
    .select("url, title, snippet, source, language, category, relevance")
    .eq("is_active", true)
    .or(`published_at.gte.${since},fetched_at.gte.${since}`)
    .order("relevance", { ascending: false })
    .limit(DIGEST_ARTICLE_LIMIT + 15);
  // An error is not "no news": surface it instead of widening the window on a dead DB.
  if (error) throw new Error(`digest article query failed: ${error.message}`);
  // Stored relevance can pre-date rule changes (women's team, city stories): re-check, then cap.
  return (data ?? [])
    .filter((row) =>
      analyzeArticleRelevance({
        title: row.title,
        link: row.url,
        pubDate: "",
        contentSnippet: row.snippet ?? "",
        source: row.source as NewsArticle["source"],
        language: row.language as NewsArticle["language"],
      }).isRelevant
    )
    .slice(0, DIGEST_ARTICLE_LIMIT);
}

type ParsedDigest = {
  title: string;
  summary: string;
  sections: DigestSection[];
  seoArticle?: DigestSeoArticle;
};

/**
 * LLM JSON → object. Models wrap JSON in fences or prose, leave trailing commas, and put
 * raw newlines inside long strings (a 700-word article): each of those is repaired here
 * instead of failing the whole day's digest.
 */
export function parseDigestJson(text: string): ParsedDigest {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  const body = stripped.slice(start, end + 1);

  const attempts = [body, repairJson(body)];
  let lastError: unknown;
  for (const candidate of attempts) {
    try {
      return validateParsedDigest(JSON.parse(candidate));
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`digest JSON unparseable: ${lastError instanceof Error ? lastError.message : lastError}`);
}

/** Escape raw control characters inside string literals and drop trailing commas. */
function repairJson(body: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of body) {
    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
      } else if (ch === "\\") {
        escaped = true;
        out += ch;
      } else if (ch === '"') {
        inString = false;
        out += ch;
      } else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

function validateParsedDigest(value: unknown): ParsedDigest {
  const v = value as Partial<ParsedDigest> | null;
  if (!v || typeof v.title !== "string" || !v.title || typeof v.summary !== "string" || !v.summary || !Array.isArray(v.sections)) {
    throw new Error("Invalid digest structure from AI");
  }
  return v as ParsedDigest;
}

// Per-attempt caps inside the 60s route budget (maxDuration): flash is normally ~15-25s.
const DIGEST_DEADLINE_MS = 55_000;
const DIGEST_ATTEMPT_CAP_MS: Record<(typeof DIGEST_MODELS)[number], number> = {
  "deepseek-v4-flash": 42_000,
  "deepseek-v4-pro": 30_000,
  "claude-sonnet-5": 40_000,
};
const MIN_ATTEMPT_MS = 8_000;

/**
 * Prompt + model fallback + parse for a given article list. No database access:
 * the unit under test for dry-runs ("does the prompt return parseable JSON in time?").
 */
export async function generateDigestFromArticles(
  articles: DigestSourceArticle[],
  options: { windowHours?: number; now?: Date; startedAt?: number; deadlineMs?: number; attemptCapMs?: number } = {}
): Promise<DigestResult> {
  const windowHours = options.windowHours ?? 24;
  const startedAt = options.startedAt ?? Date.now();
  const now = options.now ?? new Date();

  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title}\n   Source: ${a.source} | Lang: ${a.language} | Category: ${a.category}\n   Snippet: ${a.snippet?.slice(0, 400) || "N/A"}\n   URL: ${a.url}`
    )
    .join("\n\n");

  const siteUrl = getEnv("NEXT_PUBLIC_SITE_URL") ?? "https://www.liverpoolfcvn.blog";
  const today = formatDigestDateVi(now);

  // Current facts (head coach, season, squad) come first and override the model's memory:
  // without them the model "knew" a previous head coach and contradicted the articles.
  const prompt = `${buildCurrentFactsBlock(now)}\n\nToday is ${today} (${DIGEST_TIME_ZONE}).\nPublisher/source for the SEO article: Liverpool FC Việt Nam (${siteUrl}).\n\nHere are the top ${articles.length} Liverpool FC articles from the last ${describeDigestWindow(windowHours)}:\n\n${articleList}`;

  const apiKey = getEnv("VIETAPI_KEY");
  if (!apiKey) throw new Error("VIETAPI_KEY not configured");

  // ONE request for summary + sections + a 600-900 word SEO article took 84s on
  // deepseek-v4-flash (measured Oct 2026, ~55 tok/s) — longer than the route's 60s, so
  // the cron was killed before saving and the digest stopped for weeks. Two requests run
  // in parallel (core digest / SEO article); wall time is the slower one, ~35-45s.
  const [core, seo] = await Promise.all([
    runDigestModelChain<ParsedDigest>({
      prompt, system: `${DIGEST_SYSTEM_PROMPT}\n\n${CORE_ONLY_SUFFIX}`, startedAt, options,
      parse: (text) => parseDigestJson(text),
    }),
    runDigestModelChain<{ seoArticle: DigestSeoArticle }>({
      prompt, system: `${DIGEST_SYSTEM_PROMPT}\n\n${SEO_ONLY_SUFFIX}`, startedAt, options,
      parse: (text) => parseSeoOnlyJson(text),
    }).catch((err) => {
      // The SEO article is derivable from the sections (normalizeSeoArticle fallback): do not lose the digest.
      console.warn(`[digest] SEO article generation failed, using section fallback: ${err instanceof Error ? err.message : err}`);
      return null;
    }),
  ]);

  const parsed = core.value;
  // Ensure categoryVi is populated
  for (const section of parsed.sections) {
    if (!section.categoryVi && section.category) {
      section.categoryVi = CATEGORY_VI_MAP[section.category] || section.category;
    }
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    seoArticle: normalizeSeoArticle(seo?.value.seoArticle ?? parsed.seoArticle, parsed, siteUrl),
    articleCount: articles.length,
    tokensUsed: core.tokens + (seo?.tokens ?? 0),
    model: core.model,
  };
}

const CORE_ONLY_SUFFIX = `LƯU Ý ĐẦU RA: CHỈ trả JSON gồm "title", "summary", "sections". KHÔNG có trường "seoArticle".`;
const SEO_ONLY_SUFFIX = `LƯU Ý ĐẦU RA: CHỈ trả JSON dạng {"seoArticle": {...}} theo cấu trúc seoArticle ở trên. KHÔNG có "title", "summary", "sections". Bài dài 500-700 từ.`;

function parseSeoOnlyJson(text: string): { seoArticle: DigestSeoArticle } {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  const body = stripped.slice(start, end + 1);
  for (const candidate of [body, repairJson(body)]) {
    try {
      const v = JSON.parse(candidate);
      const article = v?.seoArticle ?? v;
      if (isDigestSeoArticle(article)) return { seoArticle: article };
    } catch { /* try the repaired form */ }
  }
  throw new Error("seoArticle JSON unparseable or incomplete");
}

/** Model fallback chain for one request; any failure (provider, timeout, truncation, bad JSON) moves on. */
async function runDigestModelChain<T>(args: {
  prompt: string;
  system: string;
  startedAt: number;
  options: { deadlineMs?: number; attemptCapMs?: number };
  parse: (text: string) => T;
}): Promise<{ value: T; model: string; tokens: number }> {
  const failures: string[] = [];
  for (const modelId of DIGEST_MODELS) {
    const remaining = (args.options.deadlineMs ?? DIGEST_DEADLINE_MS) - (Date.now() - args.startedAt);
    const attemptMs = Math.min(remaining, args.options.attemptCapMs ?? DIGEST_ATTEMPT_CAP_MS[modelId]);
    if (attemptMs < MIN_ATTEMPT_MS) {
      failures.push(`${modelId}: skipped, ${Math.max(0, Math.round(remaining / 1000))}s left`);
      continue;
    }
    const t0 = Date.now();
    try {
      const result = await generateText({
        model: vietapi(modelId),
        system: args.system,
        prompt: args.prompt,
        maxOutputTokens: 6000,
        abortSignal: AbortSignal.timeout(attemptMs),
      });
      if (process.env.DIGEST_DEBUG) console.warn(`[digest] ${modelId} ok in ${Date.now() - t0}ms, out=${result.usage?.outputTokens}`);
      if (result.finishReason === "length") throw new Error("output truncated (finishReason=length)");
      return { value: args.parse(result.text), model: modelId, tokens: result.usage?.totalTokens ?? 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${modelId}: ${msg.slice(0, 160)}`);
      console.warn(`[digest] ${modelId} failed, trying next: ${msg.slice(0, 160)}`);
    }
  }
  throw new Error(`All digest models failed — ${failures.join(" | ")}`);
}

export async function generateDailyDigest(): Promise<DigestResult> {
  const startedAt = Date.now();
  const supabase = getServiceClient();

  // Query top 25 most relevant articles. Prefer the last 24h, but widen the
  // window progressively if a quiet news day (or a sync hiccup) leaves too few
  // — this prevents the digest cron from failing and leaving date gaps, the way
  // it did when the is_active=null bug starved this query for ~8 days.
  const WINDOWS_HOURS = [24, 72, 24 * 7];
  const MIN_ARTICLES = 3;
  let articles: DigestSourceArticle[] = [];
  let windowHours: number = WINDOWS_HOURS[0];
  for (const hours of WINDOWS_HOURS) {
    windowHours = hours;
    articles = await fetchDigestArticles(supabase, hours);
    if (articles.length >= MIN_ARTICLES) break;
  }

  if (articles.length === 0) {
    throw new Error("No recent articles found for digest");
  }

  return generateDigestFromArticles(articles, { windowHours, startedAt });
}

/**
 * Most recent digest, read-only.
 *
 * This used to generate a missing digest inline. That put a multi-query LLM job
 * (raced against a 15s timeout that never cancelled it) on the render path of
 * `/` and `/news`: every cache miss before the daily run, or during a database
 * outage, cost the visitor ~15–25s. Generation now happens only in
 * `/api/news/digest/generate` (daily Vercel cron + hourly retry from the news
 * sync workflow); pages show the latest digest that exists.
 */
export async function getLatestDigest(): Promise<DigestRecord | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("news_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Throw rather than return null: callers cache the result for 30 min, and a
  // thrown error is not cached — a null would hide the digest after one bad read.
  if (error) throw error;
  return data;
}

export const getDigestByDate = cache(async function getDigestByDate(
  date: string
): Promise<DigestRecord | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("news_digests")
    .select("*")
    .eq("digest_date", date)
    .maybeSingle();
  return data;
});

/** Lightweight query for sitemap: all digest dates + generated timestamps */
export async function getAllDigestDates(): Promise<{ digest_date: string; generated_at: string }[]> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("news_digests")
      .select("digest_date, generated_at")
      .order("digest_date", { ascending: false })
      .limit(90);
    return data ?? [];
  } catch {
    return [];
  }
}
