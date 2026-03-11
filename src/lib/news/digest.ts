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

const DIGEST_SYSTEM_PROMPT = `You are a Vietnamese sports editor creating a daily Liverpool FC news digest.

Input: A list of recent articles with titles, snippets, sources, and categories.
Output: A structured JSON object with these exact fields:
{
  "title": "Liverpool Daily — {date in Vietnamese format}",
  "summary": "2-3 sentence overview in Vietnamese summarizing the day's key stories",
  "sections": [
    {
      "category": "category-key",
      "categoryVi": "Vietnamese category name",
      "headline": "Short headline in Vietnamese",
      "body": "2-3 sentence summary in Vietnamese combining insights from the articles",
      "articleUrls": ["url1", "url2"]
    }
  ]
}

Rules:
- Write in natural Vietnamese journalistic style
- Group articles by category; skip categories with 0 articles
- Each section summarizes 1-4 related articles from that category
- Keep player names and club names in English (Salah, Van Dijk, Arsenal)
- Football terms: "clean sheet" = "giữ sạch lưới", "assist" = "kiến tạo"
- If fewer than 5 articles provided, create a shorter "Tin Nhanh" format with 1-2 sections
- Return ONLY valid JSON — no markdown fences, no commentary, no explanations`;

export async function generateDailyDigest(): Promise<DigestResult> {
  const supabase = getServiceClient();

  // Query top 15 articles from last 24h
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: articles } = await supabase
    .from("articles")
    .select("url, title, snippet, source, language, category, relevance")
    .eq("is_active", true)
    .gte("published_at", since)
    .order("relevance", { ascending: false })
    .limit(15);

  if (!articles || articles.length === 0) {
    throw new Error("No articles found in last 24h for digest");
  }

  // Build prompt input
  const articleList = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.title}\n   Source: ${a.source} | Lang: ${a.language} | Category: ${a.category}\n   Snippet: ${a.snippet?.slice(0, 150) || "N/A"}\n   URL: ${a.url}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const prompt = `Today is ${today}.\n\nHere are the top ${articles.length} Liverpool FC articles from the last 24 hours:\n\n${articleList}`;

  // Call Groq
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const result = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    system: DIGEST_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 2000,
  });

  // Parse JSON response
  let parsed: { title: string; summary: string; sections: DigestSection[] };
  try {
    const jsonStr = result.text
      .replace(/^```json\s*/i, "")
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
  };
}

export async function getLatestDigest(): Promise<DigestRecord | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("news_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
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
