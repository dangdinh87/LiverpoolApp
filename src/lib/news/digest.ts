import "server-only";
import { cache } from "react";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { getServiceClient } from "./supabase-service";

export interface DigestSection {
  category: string;
  categoryVi: string;
  headline: string;
  body: string;
  articleUrls: string[];
}

export interface DigestResult {
  title: string;
  summary: string;
  sections: DigestSection[];
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
  article_ids: string[];
  article_count: number;
  model: string;
  tokens_used: number;
  generated_at: string;
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
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",   // best quality, 100K TPD
  "qwen/qwen3-32b",            // strong fallback, 500K TPD
  "llama-3.1-8b-instant",      // fast fallback, 500K TPD
  "openai/gpt-oss-20b",        // last resort, 200K TPD
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
  ]
}

Phong cách viết:
- Giọng văn tự nhiên, có cảm xúc — như biên tập viên đang trò chuyện với fan, KHÔNG phải bản tin thông tấn khô khan
- Dùng câu chuyển tiếp mượt mà giữa các ý (thay vì liệt kê rời rạc kiểu "Ngoài ra...", "Bên cạnh đó...")
- Được phép thể hiện cảm xúc fan: hào hứng khi thắng, lo lắng khi chấn thương, kỳ vọng trước trận lớn
- Đặt tin trong bối cảnh rộng hơn (cuộc đua vô địch, phong độ gần đây, lịch sử đối đầu)
- Kết thúc summary bằng câu tạo kỳ vọng hoặc nhận định ngắn gọn

Quy tắc nội dung:
- Nhắc TẤT CẢ tên cầu thủ, HLV quan trọng — KHÔNG được bỏ sót
- Gộp bài theo danh mục, bỏ danh mục không có bài
- Mỗi section tổng hợp 1-5 bài liên quan
- Giữ nguyên tên riêng tiếng Anh (Salah, Van Dijk, Arsenal, Slot)
- Thuật ngữ: "clean sheet" = "giữ sạch lưới", "assist" = "kiến tạo", "hat-trick" giữ nguyên
- Nêu chi tiết cụ thể: tỉ số, thống kê, ngày tháng, trích dẫn khi có
- Nếu ít hơn 5 bài, viết dạng "Tin Nhanh" với 1-2 section nhưng vẫn chi tiết
- Trả về CHỈ JSON hợp lệ — không markdown, không giải thích thêm`;

export async function generateDailyDigest(): Promise<DigestResult> {
  const supabase = getServiceClient();

  // Query top 25 most relevant articles recently synced (fetched_at) or published
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: articles } = await supabase
    .from("articles")
    .select("url, title, snippet, source, language, category, relevance")
    .eq("is_active", true)
    .or(`published_at.gte.${since},fetched_at.gte.${since}`)
    .order("relevance", { ascending: false })
    .limit(25);

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

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `Today is ${today}.\n\nHere are the top ${articles.length} Liverpool FC articles from the last 24 hours:\n\n${articleList}`;

  // Call Groq with model fallback chain
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  let result: Awaited<ReturnType<typeof generateText>>;
  let usedModel: string = GROQ_MODELS[0];

  for (const modelId of GROQ_MODELS) {
    try {
      result = await generateText({
        model: groq(modelId),
        system: DIGEST_SYSTEM_PROMPT,
        prompt,
        maxOutputTokens: 4000,
      });
      usedModel = modelId;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("Rate limit") || msg.includes("429") || msg.includes("tokens per day");
      if (isRateLimit && modelId !== GROQ_MODELS[GROQ_MODELS.length - 1]) {
        console.warn(`[digest] ${modelId} rate limited, falling back...`);
        continue;
      }
      throw err; // Non-rate-limit error or last model — rethrow
    }
  }
  // result is guaranteed assigned because the loop either breaks or throws
  result = result!;

  // Parse JSON response
  let parsed: { title: string; summary: string; sections: DigestSection[] };
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

  // Auto-generate/refresh digest if missing, wrong date, or stale (>2h)
  const today = new Date().toISOString().split("T")[0];
  const DIGEST_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
  const now = Date.now();
  const isStale = data?.generated_at
    ? now - new Date(data.generated_at).getTime() > DIGEST_STALE_MS
    : false;
  const needsGenerate = !data || data.digest_date !== today || isStale;
  const isLocked = now < digestLockUntil;

  if (needsGenerate && process.env.GROQ_API_KEY && !isLocked) {
    digestLockUntil = now + 30_000; // Lock for 30s max
    try {
      console.log("[digest] Auto-generating (stale=%s, date=%s, today=%s)...", isStale, data?.digest_date, today);
      const digest = await Promise.race([
        generateDailyDigest(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Digest timeout 15s")), 15000)
        ),
      ]);
      const { data: freshDigest } = await supabase.from("news_digests").upsert(
        {
          digest_date: today,
          title: digest.title,
          summary: digest.summary,
          sections: digest.sections,
          article_ids: digest.sections.flatMap((s) => s.articleUrls),
          article_count: digest.articleCount,
          model: digest.model,
          tokens_used: digest.tokensUsed,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "digest_date" }
      ).select("*").maybeSingle();
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
