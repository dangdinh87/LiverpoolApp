import "server-only";
import { cache } from "react";
import { BRAND } from "@/lib/brand";
import { vietapi } from "@/lib/ai/vietapi";
import { generateText } from "ai";
import { getEnv } from "@/lib/env";
import { getServiceClient } from "./supabase-service";
import { describeDigestWindow } from "./digest-window";
import { analyzeArticleRelevance } from "./relevance";
import { buildCurrentFactsBlock } from "@/lib/prompts/current-facts";
import type { NewsArticle } from "./types";
import { parseModelJson } from "@/lib/ai/parse-model-json";

const SEO_ARTICLE_SECTION_CATEGORY = "__seo_article__";

export interface DigestSection {
  category: string;
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

/** The site's own URL, named once: the prompt and the stored record both need it. */
const SITE_URL = getEnv("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";

/**
 * English, because the bare URL is English and the briefing is the biggest body
 * of original writing on the site — 90 of its ~185 indexable English URLs.
 * Every one of them used to be Vietnamese, so the language a reader got had
 * nothing to do with the page they asked for. The prompt was also written for
 * "cộng đồng fan Liverpool Việt Nam", which is two repositionings out of date.
 *
 * `categoryVi` is gone on purpose: a category label is interface text, and the
 * app already has both languages for all seven keys in `News.categories`.
 * Asking a model to invent them produced a label that only existed in one
 * language and could not be translated.
 */
const DIGEST_SYSTEM_PROMPT = `You are a football editor who follows Liverpool closely and writes the site's daily briefing. You are writing for people who want today's Liverpool news in one place, read quickly.

Input: recent articles with title, summary, source and category.
Output: a JSON object shaped like this:
{
  "title": "Liverpool Daily — {date in English, e.g. 12 October 2026}",
  "summary": "4-6 sentences. Open with the most important story, then move through the rest. Name players, give scores, keep the detail.",
  "sections": [
    {
      "category": "category-key",
      "headline": "A headline that names the person or the event",
      "body": "4-6 sentences. Join the reporting from several articles into one account with people and context in it.",
      "articleUrls": ["url1", "url2"]
    }
  ],
  "seoArticle": {
    "sourceName": "${BRAND.name}",
    "sourceUrl": "${SITE_URL}",
    "badgeLabel": "${BRAND.name}",
    "title": "A natural article headline containing Liverpool",
    "metaTitle": "50-60 characters",
    "metaDescription": "140-160 characters, carrying the focus keyword",
    "excerpt": "2-3 sentences saying what the piece covers.",
    "focusKeyword": "Liverpool news",
    "secondaryKeywords": ["Liverpool FC", "latest Liverpool news", "The Reds"],
    "body": [
      {
        "heading": "An H2 carrying one idea",
        "paragraphs": ["2-3 paragraphs, each 2-4 sentences."]
      }
    ],
    "conclusion": "A close that takes a clear view."
  }
}

Voice:
- Write like an editor talking to supporters, not a wire service
- Move between ideas with real sentences, not "Additionally" and "Furthermore"
- Feeling is allowed: pleased at a win, worried at an injury, expectant before a big game
- Put the news in context — the title race, recent form, the history between the clubs
- End the summary with a view or an expectation, not a shrug

Write like a person. Avoid the tells:
- Banned openers and fillers: "In the world of", "It is worth noting", "Interestingly", "It cannot be denied", "Overall", "In conclusion", "more than ever", "marks a turning point", "not only... but also", "Only time will tell", "Let's wait and see"
- Vary sentence length. Short, flat sentences next to longer ones. Do not let every sentence share a rhythm
- Do not start several paragraphs the same way ("Liverpool...", "The Reds...", "The side...")
- Do not scatter em dashes; use ordinary punctuation
- Do not end on something that could be said about any club on any day — have a position
- Supporters' language is fine where it fits ("The Kop", "Slot's side", "the Anfield crowd") but do not pack it in

Content rules:
- Name every player and manager that matters; leave none out
- Group articles by category, drop categories with nothing in them
- Each section draws on 1-5 related articles
- Give the specifics: scores, numbers, dates, quotes where there are any
- Fewer than 5 articles: write it short, 1-2 sections, still with the detail
- seoArticle is its own piece about Liverpool, not the summary again
- seoArticle names "${BRAND.name}" as source and publisher, and keeps sourceUrl exactly as given
- seoArticle runs 600-900 words with a standfirst, 3-5 H2s, and the focus keyword read naturally into the title, the standfirst and at least one H2
- Never copy a source's wording. Summarise and rewrite; attribution lives in each section's articleUrls
- Return ONLY valid JSON — no markdown, no commentary`;

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
    heading: section.headline || "Liverpool news",
    paragraphs: [section.body].filter(Boolean),
  }));

  const rawBody = Array.isArray(seoArticle?.body) ? seoArticle.body : [];
  const body = rawBody
    .map((section) => ({
      heading: typeof section?.heading === "string" && section.heading.trim()
        ? section.heading.trim()
        : "Liverpool news",
      paragraphs: asStringArray(section?.paragraphs),
    }))
    .filter((section) => section.paragraphs.length > 0);

  const title = seoArticle?.title?.trim() || parsed.title;
  const excerpt = seoArticle?.excerpt?.trim() || parsed.summary;
  const metaDescription =
    seoArticle?.metaDescription?.trim() || parsed.summary.slice(0, 160);

  return {
    sourceName: BRAND.name,
    sourceUrl,
    badgeLabel: seoArticle?.badgeLabel?.trim() || BRAND.name,
    title,
    metaTitle: seoArticle?.metaTitle?.trim() || title.slice(0, 60),
    metaDescription,
    excerpt,
    focusKeyword: seoArticle?.focusKeyword?.trim() || "Liverpool news",
    secondaryKeywords: asStringArray(seoArticle?.secondaryKeywords).slice(0, 8),
    body: body.length > 0 ? body : fallbackBody,
    conclusion:
      // Named the site LFCVN, two renames ago, in copy that ships to readers.
      seoArticle?.conclusion?.trim() ||
      `There is more to come from Liverpool, and ${BRAND.name} will keep gathering it as it lands.`,
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
  return validateParsedDigest(parseModelJson(text));
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

  const today = formatDigestDateVi(now);

  // Current facts (head coach, season, squad) come first and override the model's memory:
  // without them the model "knew" a previous head coach and contradicted the articles.
  const prompt = `${buildCurrentFactsBlock(now)}\n\nToday is ${today} (${DIGEST_TIME_ZONE}).\nPublisher/source for the SEO article: ${BRAND.name} (${SITE_URL}).\n\nHere are the top ${articles.length} Liverpool FC articles from the last ${describeDigestWindow(windowHours)}:\n\n${articleList}`;

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

  return {
    title: parsed.title,
    summary: parsed.summary,
    sections: parsed.sections,
    seoArticle: normalizeSeoArticle(seo?.value.seoArticle ?? parsed.seoArticle, parsed, SITE_URL),
    articleCount: articles.length,
    tokensUsed: core.tokens + (seo?.tokens ?? 0),
    model: core.model,
  };
}

const CORE_ONLY_SUFFIX = `OUTPUT: return ONLY a JSON object with "title", "summary" and "sections". No "seoArticle" field.`;
const SEO_ONLY_SUFFIX = `OUTPUT: return ONLY {"seoArticle": {...}} in the shape given above. No "title", "summary" or "sections". 500-700 words.`;

function parseSeoOnlyJson(text: string): { seoArticle: DigestSeoArticle } {
  try {
    const v = parseModelJson<{ seoArticle?: unknown }>(text);
    const article = (v as { seoArticle?: unknown })?.seoArticle ?? v;
    if (isDigestSeoArticle(article)) return { seoArticle: article };
  } catch { /* fall through to the shared failure below */ }
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
