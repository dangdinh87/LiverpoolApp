import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { scrapeArticle } from "@/lib/news";

export const maxDuration = 60;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

const TRANSLATE_PROMPT = `You are a senior Vietnamese sports journalist who writes for a top football news site. Translate the following English football article into natural, fluent Vietnamese that reads like it was originally written in Vietnamese.

Context — this is about Liverpool FC. Key people and roles:
- Arne Slot = HLV trưởng (head coach)
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
- Keep player names, club names in English (e.g., Salah, Van Dijk, Arsenal)
- Understand context: distinguish "move" (transfer) vs "move" (on-pitch movement)
- Translate idioms meaningfully, not literally (e.g., "pull the trigger" = "ra quyết định")

Format rules:
- Separate each translated section with "|||" on its own line
- First section = title, then each paragraph follows
- Do NOT include labels like "TITLE:", "TIÊU ĐỀ:", "P1:", etc.
- Skip promotional text (FOLLOW OUR PAGE, Sign up, Newsletter)
- Return ONLY the Vietnamese translation, no commentary`;

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Translation service unavailable" },
      { status: 503 }
    );
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Check DB cache first
    const { data: cached } = await supabase
      .from("articles")
      .select("title_vi, snippet_vi, content_vi")
      .eq("url", url)
      .single();

    if (cached?.content_vi) {
      return NextResponse.json({
        title_vi: cached.title_vi,
        description_vi: cached.content_vi.description || null,
        snippet_vi: cached.snippet_vi,
        paragraphs: cached.content_vi.paragraphs,
        cached: true,
      });
    }

    // Scrape article content
    const content = await scrapeArticle(url);
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

    // Call Groq for translation
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: TRANSLATE_PROMPT,
      prompt: input,
      maxOutputTokens: 4000,
    });

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
