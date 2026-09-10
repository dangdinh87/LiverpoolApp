import "server-only";
import { cache } from "react";
import { vietapi } from "@/lib/ai/vietapi";
import { generateText } from "ai";
import { getEnv, hasEnv } from "@/lib/env";
import { getServiceClient } from "./supabase-service";

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
  "claude-sonnet-5",   // best long-form Vietnamese prose
  "deepseek-v4-pro",   // fast, clean diacritics
  "deepseek-v4-flash", // cheap last resort
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

function shouldTryNextGroqModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|tokens per|does not exist|do not have access|model|overloaded|timeout|503|502|504|500/i.test(msg);
}

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

// Fetch the top relevant active articles within the last `windowHours`.
// Matches on either publish time or sync time so freshly-synced items count.
async function fetchDigestArticles(
  supabase: ReturnType<typeof getServiceClient>,
  windowHours: number
) {
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("articles")
    .select("url, title, snippet, source, language, category, relevance")
    .eq("is_active", true)
    .or(`published_at.gte.${since},fetched_at.gte.${since}`)
    .order("relevance", { ascending: false })
    .limit(25);
  return data ?? [];
}

export async function generateDailyDigest(): Promise<DigestResult> {
  const supabase = getServiceClient();

  // Query top 25 most relevant articles. Prefer the last 24h, but widen the
  // window progressively if a quiet news day (or a sync hiccup) leaves too few
  // — this prevents the digest cron from failing and leaving date gaps, the way
  // it did when the is_active=null bug starved this query for ~8 days.
  const WINDOWS_HOURS = [24, 72, 24 * 7];
  const MIN_ARTICLES = 3;
  let articles: NonNullable<Awaited<ReturnType<typeof fetchDigestArticles>>> = [];
  for (const hours of WINDOWS_HOURS) {
    articles = await fetchDigestArticles(supabase, hours);
    if (articles.length >= MIN_ARTICLES) break;
  }

  if (!articles || articles.length === 0) {
    throw new Error("No recent articles found for digest");
  }

  // Build prompt input
  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title}\n   Source: ${a.source} | Lang: ${a.language} | Category: ${a.category}\n   Snippet: ${a.snippet?.slice(0, 400) || "N/A"}\n   URL: ${a.url}`
    )
    .join("\n\n");

  const siteUrl = getEnv("NEXT_PUBLIC_SITE_URL") ?? "https://www.liverpoolfcvn.blog";
  const today = formatDigestDateVi();

  const prompt = `Today is ${today} (${DIGEST_TIME_ZONE}).\nPublisher/source for the SEO article: Liverpool FC Việt Nam (${siteUrl}).\n\nHere are the top ${articles.length} Liverpool FC articles from the last 24 hours:\n\n${articleList}`;

  // Call Groq with model fallback chain
  const apiKey = getEnv("VIETAPI_KEY");
  if (!apiKey) throw new Error("VIETAPI_KEY not configured");
  let result: Awaited<ReturnType<typeof generateText>>;
  let usedModel: string = DIGEST_MODELS[0];

  for (const [index, modelId] of DIGEST_MODELS.entries()) {
    try {
      result = await generateText({
        model: vietapi(modelId),
        system: DIGEST_SYSTEM_PROMPT,
        prompt,
        maxOutputTokens: 6000,
      });
      usedModel = modelId;
      break;
    } catch (err) {
      if (index < DIGEST_MODELS.length - 1 && shouldTryNextGroqModel(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[digest] ${modelId} failed, falling back: ${msg.slice(0, 160)}`);
        continue;
      }
      throw err;
    }
  }
  // result is guaranteed assigned because the loop either breaks or throws
  result = result!;

  // Parse JSON response
  let parsed: {
    title: string;
    summary: string;
    sections: DigestSection[];
    seoArticle?: DigestSeoArticle;
  };
  try {
    const jsonStr = result.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse digest JSON: ${result.text.slice(0, 200)}`
    );
  }

  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.sections)) {
    throw new Error("Invalid digest structure from AI");
  }

  // Ensure categoryVi is populated
  for (const section of parsed.sections) {
    if (!section.categoryVi && section.category) {
      section.categoryVi =
        CATEGORY_VI_MAP[section.category] || section.category;
    }
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    seoArticle: normalizeSeoArticle(parsed.seoArticle, parsed, siteUrl),
    articleCount: articles.length,
    tokensUsed: result.usage?.totalTokens ?? 0,
    model: usedModel,
  };
}

// Timestamp-based lock: auto-expires after 30s to prevent stuck state
let digestLockUntil = 0;

export async function getLatestDigest(): Promise<DigestRecord | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("news_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Auto-generate only for a missing Vietnam-date digest or to backfill SEO payload.
  // Do not regenerate every few hours: the digest article is a canonical daily page.
  const today = getDigestDateKey();
  const now = Date.now();
  const seoArticle = data ? getSeoArticleFromDigest(data) : null;
  const needsGenerate = !data || data.digest_date !== today || !seoArticle;
  const isLocked = now < digestLockUntil;

  if (needsGenerate && hasEnv("VIETAPI_KEY") && !isLocked) {
    digestLockUntil = now + 30_000; // Lock for 30s max
    try {
      console.log("[digest] Auto-generating (date=%s, today=%s, hasSeo=%s)...", data?.digest_date, today, !!seoArticle);
      const digest = await Promise.race([
        generateDailyDigest(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Digest timeout 15s")), 15000)
        ),
      ]);
      const freshDigest = await upsertDigestRecord(data, today, digest);
      console.log("[digest] Auto-generated OK, sections:", digest.sections.length);
      digestLockUntil = 0;
      return freshDigest ?? data;
    } catch (err) {
      console.warn("[digest] Auto-generation failed:", err instanceof Error ? err.message : err);
      digestLockUntil = 0; // Release lock on error so next request can retry
      return data;
    }
  }

  if (needsGenerate && isLocked) {
    console.log("[digest] Skipped — locked until", new Date(digestLockUntil).toISOString());
  }

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
