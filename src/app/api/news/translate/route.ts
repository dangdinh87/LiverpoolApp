import { type NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getDefaultSlotModels } from "@/lib/ai/ai-model-slots";
import { getModelChain } from "@/lib/ai/model-settings";
import { hasAnyAiProvider, resolveModelAttempts } from "@/lib/ai/providers";
import { hasForeignScript, stripForeignScript } from "@/lib/ai/strip-foreign-script";
import { scrapeArticle } from "@/lib/news";
import { getServiceClient } from "@/lib/news/supabase-service";
import { isSameOriginRequest } from "@/lib/http-origin";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isKnownNewsSourceUrl } from "@/lib/news-config";
import { articleUrlVariants, canonicalizeArticleUrl } from "@/lib/news/url";
import { buildCurrentFactsBlock } from "@/lib/prompts/current-facts";
import type { ArticleContent } from "@/lib/news/types";

export const maxDuration = 60;

// Cap input characters sent to the LLM so giant liveblogs cannot overrun the
// 60s route budget or exhaust maxOutputTokens.
const MAX_TRANSLATE_CHARS = 18_000;
const TRANSLATE_ATTEMPT_TIMEOUT_MS = 28_000;
const TRANSLATE_DEADLINE_MS = 55_000;
const MIN_TRANSLATE_ATTEMPT_MS = 8_000;

function buildTranslateSystemPrompt(): string {
  return `You are a senior Vietnamese sports journalist who writes for a top football news site. Translate the following English football article into natural, fluent Vietnamese that reads like it was originally written in Vietnamese.

${buildCurrentFactsBlock()}

Additional LFC executive roles:
- Julian Ward = giám đốc thể thao (sporting director, appointed Sept 2026), NOT a player
- Richard Hughes = cựu giám đốc thể thao (former sporting director), NOT a player
- Mike Gordon = chủ tịch FSG (FSG president)
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
}

interface CachedTranslationContent {
  description?: string | null;
  paragraphs?: string[];
}

interface TranslationPayload {
  title_vi: string;
  description_vi: string | null;
  snippet_vi: string | null;
  paragraphs: string[];
  model?: string;
  cached: boolean;
}

// Deduplicate concurrent uncached translations for the same canonical URL in one isolate.
const inflightTranslations = new Map<string, Promise<TranslationPayload>>();

function shouldTryNextModel(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /429|rate limit|tokens per|does not exist|do not have access|model|overloaded|timeout|abort|503|502|504|500/i.test(msg);
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

function capParagraphsByChars(paragraphs: string[], maxChars: number): string[] {
  const out: string[] = [];
  let used = 0;
  for (const p of paragraphs) {
    if (used + p.length > maxChars && out.length > 0) break;
    out.push(p.slice(0, maxChars));
    used += p.length + 5;
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    const url = body && typeof body === "object" ? (body as { url?: unknown }).url : undefined;
    if (!url || typeof url !== "string" || url.length > 2048) {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }
    if (!isKnownNewsSourceUrl(url)) {
      return NextResponse.json({ error: "Unsupported article URL" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const canonicalUrl = canonicalizeArticleUrl(url);
    const urlVariants = articleUrlVariants(url);

    // Check DB first — only translate Liverpool articles actually stored by our sync pipeline.
    const { data: cached } = await supabase
      .from("articles")
      .select("title_vi, snippet_vi, content_vi, content_en")
      .in("url", urlVariants)
      .order("content_scraped_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!cached) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (isUsableTranslation(cached.content_vi)) {
      return NextResponse.json({
        title_vi: cached.title_vi,
        description_vi: cached.content_vi.description || null,
        snippet_vi: cached.snippet_vi,
        paragraphs: cached.content_vi.paragraphs ?? [],
        cached: true,
      });
    }

    // Rate limit only uncached AI generations. Cached DB translations are free to read.
    const ip = getClientIP(req);
    const rateLimitError = (retryAfterSec: number) =>
      NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "Cache-Control": "no-store",
          },
        },
      );
    if (!checkRateLimit("translate:global:min", 30, 60_000).allowed) {
      return rateLimitError(60);
    }
    if (!checkRateLimit(`translate:min:${ip}`, 3, 60_000).allowed) {
      return rateLimitError(60);
    }
    if (!checkRateLimit(`translate:hr:${ip}`, 10, 3_600_000).allowed) {
      return rateLimitError(3_600);
    }

    if (!hasAnyAiProvider()) {
      return NextResponse.json(
        { error: "Translation service unavailable" },
        { status: 503 }
      );
    }

    const existingPromise = inflightTranslations.get(canonicalUrl);
    if (existingPromise) {
      const payload = await existingPromise;
      return NextResponse.json({ ...payload, cached: true });
    }

    const work = (async (): Promise<TranslationPayload | null> => {
      const content = isUsableArticleContent(cached.content_en)
        ? cached.content_en
        : await scrapeArticle(url);
      if (!content || content.paragraphs.length === 0) {
        return null;
      }

      const junkPattern = /FOLLOW\s+(OUR|US)|FACEBOOK\s+PAGE|join our (?:new )?whatsapp|Sign up|Newsletter|Subscribe|Click here|READ MORE|READ NEXT|Continue reading|appeared first on|IconSport|Getty Images|Image:/i;
      const cleanParagraphs = capParagraphsByChars(
        content.paragraphs.filter((p) => !junkPattern.test(p)),
        MAX_TRANSLATE_CHARS
      );

      const sections = [content.title];
      if (content.description) sections.push(content.description);
      sections.push(...cleanParagraphs);
      const input = sections.join("\n|||\n");
      const systemPrompt = buildTranslateSystemPrompt();

      const chain = await getModelChain("translate", getDefaultSlotModels("translate"));
      const attempts = resolveModelAttempts(chain, { feature: "translate" });
      if (attempts.length === 0) {
        throw new Error("No configured AI provider for translate");
      }

      const startedAt = Date.now();
      let translatedText: string | undefined;
      let usedModel: string = attempts[0].modelId;
      for (const [index, attempt] of attempts.entries()) {
        const label = `${attempt.modelId}${attempt.viaGateway ? " (gw)" : ""}`;
        const remaining = TRANSLATE_DEADLINE_MS - (Date.now() - startedAt);
        const attemptMs = Math.min(remaining, TRANSLATE_ATTEMPT_TIMEOUT_MS);
        if (attemptMs < MIN_TRANSLATE_ATTEMPT_MS) break;
        try {
          const result = await generateText({
            model: attempt.model,
            maxRetries: 0,
            system: systemPrompt,
            prompt: input,
            maxOutputTokens: 4000,
            abortSignal: AbortSignal.timeout(attemptMs),
          });
          if (hasForeignScript(result.text)) {
            if (index < attempts.length - 1) {
              console.warn(`[translate] ${label} returned unexpected script, falling back...`);
              continue;
            }
            translatedText = stripForeignScript(result.text);
          } else {
            translatedText = result.text;
          }
          usedModel = attempt.modelId;
          break;
        } catch (err) {
          if (index < attempts.length - 1 && shouldTryNextModel(err)) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[translate] ${label} failed, falling back: ${msg.slice(0, 160)}`);
            continue;
          }
          throw err;
        }
      }
      if (!translatedText) throw new Error("All translation models failed");

      const stripPrefix = (s: string) =>
        s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();

      const translated = translatedText.split("|||").map((s) => stripPrefix(s));
      const titleVi = translated[0] || content.title;

      const hasDescription = !!content.description;
      const descriptionVi = hasDescription ? (translated[1] || "") : "";
      const paragraphsVi = translated
        .slice(hasDescription ? 2 : 1)
        .map((p) => stripPrefix(p))
        .filter((p) => p.length > 0);

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
        .in("url", urlVariants);

      return {
        title_vi: titleVi,
        description_vi: descriptionVi || null,
        snippet_vi: paragraphsVi[0]?.slice(0, 200) || null,
        paragraphs: paragraphsVi,
        model: usedModel,
        cached: false,
      };
    })();

    inflightTranslations.set(canonicalUrl, work as Promise<TranslationPayload>);
    let payload: TranslationPayload | null;
    try {
      payload = await work;
    } finally {
      inflightTranslations.delete(canonicalUrl);
    }

    if (!payload) {
      return NextResponse.json(
        { error: "Could not extract article content" },
        { status: 404 }
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[translate] Error:", err);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
