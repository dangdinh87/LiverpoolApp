import { type NextRequest, NextResponse } from "next/server";
import { vietapi } from "@/lib/ai/vietapi";
import { generateText } from "ai";
import { getEnv } from "@/lib/env";
import { scrapeArticle } from "@/lib/news";
import { getServiceClient } from "@/lib/news/supabase-service";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import type { ArticleContent } from "@/lib/news/types";

export const maxDuration = 60;

const TRANSLATE_PROMPT = `You are a senior Vietnamese sports journalist who writes for a top football news site. Translate the following English football article into natural, fluent Vietnamese that reads like it was originally written in Vietnamese.

Context — this is about Liverpool FC. Key people and roles:
- Andoni Iraola = HLV trưởng (head coach)
- Richard Hughes = giám đốc thể thao (sporting director), NOT a player
- Michael Edwards = CEO bóng đá (CEO of football)
- FSG = chủ sở hữu (owners)

Translation rules:
- Write naturally in Vietnamese journalistic style — avoid word-by-word translation
- "move" in transfer context = "thương vụ", NOT "di chuyển"
- "deal" = "thương vụ" or "hợp đồng", "fee" = "phí chuyển nhượng"
- "sporting director" = "giám đốc thể thao", "head coach" = "HLV trưởng"
- "clean sheet" = "giữ sạch lưới", "assist" = "kiến tạo", "goal" = "bàn thắng"
- "Premier League" = "Ngoại hạng Anh", "Champions League" giữ nguyên
- Keep player names, club names in English (e.g., Van Dijk, Wirtz, Arsenal)
- Understand context: distinguish "move" (transfer) vs "move" (on-pitch movement)
- Translate idioms meaningfully, not literally (e.g., "pull the trigger" = "ra quyết định")
- Output must be Vietnamese only, with English names preserved. Translate weekdays/months fully (e.g., Wednesday = thứ Tư). Do not output Cyrillic, Russian, Chinese, or other non-Vietnamese scripts.

Format rules:
- Separate each translated section with "|||" on its own line
- First section = title, second section = description if it is present in the input, then each paragraph follows
- Do NOT include labels like "TITLE:", "TIÊU ĐỀ:", "P1:", etc.
- Skip promotional text (FOLLOW OUR PAGE, Sign up, Newsletter)
- Return ONLY the Vietnamese translation, no commentary`;

// VietAPI models, verified live 2026-09-09. Ordered cheapest-first: translation
// is high volume and the flash tier already returns clean Vietnamese.
const TRANSLATE_MODELS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "claude-sonnet-5",
] as const;

interface CachedTranslationContent {
  description?: string | null;
  paragraphs?: string[];
}

function shouldTryNextGroqModel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|tokens per|does not exist|do not have access|model|overloaded|timeout|503|502|504|500/i.test(msg);
}

function isUsableTranslation(content: unknown): content is CachedTranslationContent {
  if (!content || typeof content !== "object") return false;
  const paragraphs = (content as CachedTranslationContent).paragraphs;
  return Array.isArray(paragraphs) && paragraphs.some((p) => typeof p === "string" && p.trim().length > 0);
}

function isUsableArticleContent(content: unknown): content is ArticleContent {
  if (!content || typeof content !== "object") return false;
  const paragraphs = (content as ArticleContent).paragraphs;
  return Array.isArray(paragraphs) && paragraphs.some((p) => typeof p === "string" && p.trim().length > 0);
}

function hasUnexpectedScript(text: string): boolean {
  return /[\u0400-\u04FF\u3400-\u9FFF]/u.test(text);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Check DB cache first
    const { data: cached } = await supabase
      .from("articles")
      .select("title_vi, snippet_vi, content_vi, content_en")
      .eq("url", url)
      .maybeSingle();

    if (cached && isUsableTranslation(cached.content_vi)) {
      return NextResponse.json({
        title_vi: cached.title_vi,
        description_vi: cached.content_vi.description || null,
        snippet_vi: cached.snippet_vi,
        paragraphs: cached.content_vi.paragraphs,
        cached: true,
      });
    }

    // Rate limit only uncached AI generations. Cached DB translations are free to read.
    const { allowed } = checkRateLimit(`translate:${getClientIP(req)}`, 10, 3_600_000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const apiKey = getEnv("VIETAPI_KEY");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation service unavailable" },
        { status: 503 }
      );
    }

    // Prefer pre-scraped DB content. Falling back to live scraping can be slow or blocked by sources.
    const content = isUsableArticleContent(cached?.content_en)
      ? cached.content_en
      : await scrapeArticle(url);
    if (!content || content.paragraphs.length === 0) {
      return NextResponse.json(
        { error: "Could not extract article content" },
        { status: 404 }
      );
    }

    // Filter out junk paragraphs (social media CTAs, newsletter promos, source attribution noise)
    const junkPattern = /FOLLOW\s+(OUR|US)|FACEBOOK\s+PAGE|Sign up|Newsletter|Subscribe|Click here|READ MORE|READ NEXT|IconSport|Getty Images|Image:/i;
    const cleanParagraphs = content.paragraphs
      .filter((p) => !junkPattern.test(p))
      .slice(0, 15);

    // Build translation input: title + description (if any) + paragraphs
    const sections = [content.title];
    if (content.description) sections.push(content.description);
    sections.push(...cleanParagraphs);
    const input = sections.join("\n|||\n");

    // Model fallback on rate limit / provider error
    let result;
    let usedModel: string = TRANSLATE_MODELS[0];
    for (const [index, modelId] of TRANSLATE_MODELS.entries()) {
      try {
        result = await generateText({
          model: vietapi(modelId),
          system: TRANSLATE_PROMPT,
          prompt: input,
          maxOutputTokens: 4000,
        });
        if (hasUnexpectedScript(result.text) && index < TRANSLATE_MODELS.length - 1) {
          console.warn(`[translate] ${modelId} returned unexpected script, falling back...`);
          result = undefined;
          continue;
        }
        usedModel = modelId;
        break; // success
      } catch (err) {
        if (index < TRANSLATE_MODELS.length - 1 && shouldTryNextGroqModel(err)) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[translate] ${modelId} failed, falling back: ${msg.slice(0, 160)}`);
          continue;
        }
        throw err;
      }
    }
    if (!result) throw new Error("All translation models failed");

    // Parse translated sections — strip any label prefixes the LLM might add
    const stripPrefix = (s: string) =>
      s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();

    const translated = result.text.split("|||").map((s) => stripPrefix(s));
    const titleVi = translated[0] || content.title;

    // If we sent description, second section is description_vi
    const hasDescription = !!content.description;
    const descriptionVi = hasDescription ? (translated[1] || "") : "";
    const paragraphsVi = translated
      .slice(hasDescription ? 2 : 1)
      .map((p) => stripPrefix(p))
      .filter((p) => p.length > 0);

    // Save to DB
    const contentVi = {
      description: descriptionVi,
      paragraphs: paragraphsVi,
      translatedAt: new Date().toISOString(),
    };

    await supabase
      .from("articles")
      .update({
        title_vi: titleVi,
        snippet_vi: paragraphsVi[0]?.slice(0, 200) || null,
        content_vi: contentVi,
      })
      .eq("url", url);

    return NextResponse.json({
      title_vi: titleVi,
      description_vi: descriptionVi || null,
      snippet_vi: paragraphsVi[0]?.slice(0, 200) || null,
      paragraphs: paragraphsVi,
      model: usedModel,
      cached: false,
    });
  } catch (err) {
    console.error("[translate] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 500 }
    );
  }
}
