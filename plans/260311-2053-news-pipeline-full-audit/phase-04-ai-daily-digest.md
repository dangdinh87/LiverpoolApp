# Phase 04 — AI Daily Digest

**Date:** 2026-03-11 | **Priority:** MEDIUM | **Effort:** 5h
**Implementation status:** Pending | **Review status:** N/A

## Overview

New feature: AI-generated daily news digest using Groq LLaMA 3.3-70b. Cron generates bilingual digest from top articles, stores in `news_digests` table, displayed as pinned card on /news and dedicated page at /news/digest/[date].

## Context Links

- Brainstorm: `plans/reports/brainstorm-260311-2053-news-pipeline-audit-and-ai-digest.md`
- Phase 03: `phase-03-reliability-monitoring.md` (depends on — clean pipeline)

## Key Insights

1. Groq already integrated: `@ai-sdk/groq` + `generateText()` used in translate route (`src/app/api/news/translate/route.ts`) and chat (`src/app/api/chat-groq/route.ts`). Pattern well-established.
2. Model: `llama-3.3-70b-versatile` — same as translate. Free tier has ~14,400 req/day and ~6,000 tokens/min limit. Daily digest = 1 req/day, well within limits.
3. Approach A (cron-generated static digest) is correct per brainstorm. Pre-generated = instant load, predictable cost, no user-facing latency.
4. Digest should be primarily Vietnamese (target audience). English summary optional.
5. Existing `articles` table has `relevance` score, `category`, `published_at` — sufficient for selecting top articles for digest.

## Requirements

### Database: news_digests table
Store generated digests with date uniqueness.

### Cron endpoint: /api/news/digest/generate
Daily 7:00 AM VN (00:00 UTC) — query top articles, call Groq, store result.

### UI: Pinned digest card on /news
Collapsible card at top of NewsFeed showing today's digest summary.

### UI: Dedicated page /news/digest/[date]
Full digest page with sections, article links, sharing.

## Architecture

### Data Model

```sql
CREATE TABLE news_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date date UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  sections jsonb NOT NULL,
  article_ids text[] NOT NULL,
  article_count int NOT NULL,
  model text NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  tokens_used int,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_digests_date ON news_digests (digest_date DESC);

-- Enable RLS
ALTER TABLE news_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON news_digests FOR SELECT USING (true);
```

### Sections JSONB schema

```typescript
interface DigestSection {
  category: string;        // "match-report", "transfer", "injury", etc.
  categoryVi: string;      // "Kết Quả Trận Đấu", "Chuyển Nhượng", etc.
  headline: string;        // Short headline for section
  body: string;           // 2-3 sentence summary
  articleUrls: string[];  // Source article URLs
}

interface DigestRecord {
  id: string;
  digest_date: string;    // YYYY-MM-DD
  title: string;          // "Liverpool Daily — March 11, 2026"
  summary: string;        // 2-3 sentence overview
  sections: DigestSection[];
  article_ids: string[];  // All article URLs used
  article_count: number;
  model: string;
  tokens_used: number;
  generated_at: string;
}
```

### Generation Flow

```
Cron (daily 00:00 UTC / 7:00 AM VN) →
  1. Query top 15 articles from last 24h (by relevance, is_active=true)
  2. Build prompt with article titles + snippets
  3. Call Groq LLaMA 3.3-70b-versatile
  4. Parse structured response
  5. Upsert into news_digests (date-unique)
  6. Return success/stats
```

### AI Prompt Design

System prompt emphasizes structured output:
```
You are a Vietnamese sports editor creating a daily Liverpool FC news digest.

Input: A list of recent articles with titles, snippets, sources, and categories.
Output: A structured JSON digest with these exact fields:
{
  "title": "Liverpool Daily — {date}",
  "summary": "2-3 sentence overview in Vietnamese",
  "sections": [
    {
      "category": "match-report",
      "categoryVi": "Kết Quả Trận Đấu",
      "headline": "Short headline in Vietnamese",
      "body": "2-3 sentence summary in Vietnamese",
      "articleUrls": ["url1", "url2"]
    }
  ]
}

Rules:
- Write in natural Vietnamese journalistic style
- Group articles by category; skip categories with 0 articles
- Each section summarizes 1-4 related articles
- Keep player/club names in English
- If <5 articles, create a shorter "Quick Update" format with single section
- Return ONLY valid JSON, no markdown fences, no commentary
```

### UI Design

**Pinned card on /news:**
- Shows digest title + summary
- Expandable/collapsible (default collapsed after first view)
- "Read full digest" link to /news/digest/[date]
- Badge: "AI Digest" with sparkle icon

**Dedicated page /news/digest/[date]:**
- Hero header with date
- Sections rendered as cards with category badges
- Each section links to source articles
- Share button (copy link)
- Previous/next digest navigation

## Related Code Files

| File | Role | Changes |
|------|------|---------|
| Supabase migration | Schema | Create news_digests table |
| `src/app/api/news/digest/generate/route.ts` | **NEW** — cron generation endpoint |
| `src/lib/news/digest.ts` | **NEW** — digest generation logic |
| `src/app/news/page.tsx` | News page | Add digest query + pinned card |
| `src/components/news/digest-card.tsx` | **NEW** — pinned digest card |
| `src/app/news/digest/[date]/page.tsx` | **NEW** — full digest page |
| `src/components/news/digest-view.tsx` | **NEW** — digest page content |
| `vercel.json` | Cron config | Add digest generation schedule |

## Implementation Steps

### Step 1: Database migration (15m)

Run Supabase migration for `news_digests` table (schema above).

### Step 2: Digest generation logic (1.5h)

**Create `src/lib/news/digest.ts`**:

```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

interface DigestSection {
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
  const articleList = articles.map((a, i) =>
    `[${i + 1}] ${a.title}\n   Source: ${a.source} | Lang: ${a.language} | Category: ${a.category}\n   Snippet: ${a.snippet?.slice(0, 150) || "N/A"}\n   URL: ${a.url}`
  ).join("\n\n");

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
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
    // Strip markdown fences if present
    const jsonStr = result.text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse digest JSON: ${result.text.slice(0, 200)}`);
  }

  // Validate and normalize
  if (!parsed.title || !parsed.summary || !Array.isArray(parsed.sections)) {
    throw new Error("Invalid digest structure from AI");
  }

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
    articleCount: articles.length,
    tokensUsed: result.usage?.totalTokens ?? 0,
  };
}

export async function getLatestDigest() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("news_digests")
    .select("*")
    .order("digest_date", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getDigestByDate(date: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("news_digests")
    .select("*")
    .eq("digest_date", date)
    .single();
  return data;
}
```

### Step 3: Cron endpoint (30m)

**Create `src/app/api/news/digest/generate/route.ts`**:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDailyDigest } from "@/lib/news/digest";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 503 });
  }

  try {
    const digest = await generateDailyDigest();
    const supabase = getServiceClient();

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { error } = await supabase.from("news_digests").upsert({
      digest_date: today,
      title: digest.title,
      summary: digest.summary,
      sections: digest.sections,
      article_ids: digest.sections.flatMap((s) => s.articleUrls),
      article_count: digest.articleCount,
      model: "llama-3.3-70b-versatile",
      tokens_used: digest.tokensUsed,
    }, { onConflict: "digest_date" });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      date: today,
      title: digest.title,
      sections: digest.sections.length,
      articleCount: digest.articleCount,
      tokensUsed: digest.tokensUsed,
    });
  } catch (err) {
    console.error("[digest] Generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest generation failed" },
      { status: 500 }
    );
  }
}
```

### Step 4: Vercel cron config (5m)

**`vercel.json`** — add digest generation:
```json
{
  "crons": [
    { "path": "/api/news/sync?key=$CRON_SECRET", "schedule": "*/15 * * * *" },
    { "path": "/api/news/cleanup?key=$CRON_SECRET", "schedule": "0 3 * * *" },
    { "path": "/api/news/digest/generate?key=$CRON_SECRET", "schedule": "0 0 * * *" }
  ]
}
```
Note: `0 0 * * *` = midnight UTC = 7:00 AM Vietnam time (UTC+7).

### Step 5: Pinned digest card on /news (1h)

**Create `src/components/news/digest-card.tsx`**:

```typescript
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface DigestProps {
  date: string;
  title: string;
  summary: string;
  sectionCount: number;
  articleCount: number;
}

const DISMISSED_KEY = "lfc-digest-dismissed";

export function DigestCard({ date, title, summary, sectionCount, articleCount }: DigestProps) {
  const t = useTranslations("News.digest");
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(DISMISSED_KEY);
    if (last === date) setDismissed(true);
  }, [date]);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-lfc-red/10 via-stadium-surface to-stadium-surface border border-lfc-red/30 overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-lfc-gold" />
            <span className="font-barlow text-[10px] uppercase tracking-widest text-lfc-gold font-bold">
              {t("badge")}
            </span>
          </div>
          <button
            onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, date); }}
            className="text-stadium-muted hover:text-white text-xs cursor-pointer"
          >
            {t("dismiss")}
          </button>
        </div>

        <h3 className="font-inter text-lg font-bold text-white mb-2">{title}</h3>

        {expanded && (
          <p className="font-inter text-sm text-white/70 leading-relaxed mb-3">{summary}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 font-barlow text-xs uppercase tracking-wider text-stadium-muted hover:text-white transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? t("collapse") : t("expand")}
          </button>

          <Link
            href={`/news/digest/${date}`}
            className="font-barlow text-xs uppercase tracking-wider text-lfc-red hover:text-white transition-colors"
          >
            {t("readFull")} →
          </Link>

          <span className="font-inter text-[11px] text-stadium-muted ml-auto">
            {t("articleCount", { count: articleCount })}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**Update `src/app/news/page.tsx`**:
```typescript
import { getLatestDigest } from "@/lib/news/digest";
import { DigestCard } from "@/components/news/digest-card";

// In NewsPage:
const [allArticles, digest] = await Promise.all([
  getNewsFromDB(30, userLang),
  getLatestDigest(),
]);

// Before <NewsFeed>:
{digest && (
  <DigestCard
    date={digest.digest_date}
    title={digest.title}
    summary={digest.summary}
    sectionCount={digest.sections.length}
    articleCount={digest.article_count}
  />
)}
```

### Step 6: Dedicated digest page (1h)

**Create `src/app/news/digest/[date]/page.tsx`**:

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDigestByDate } from "@/lib/news/digest";
import { CATEGORY_CONFIG, getArticleUrl } from "@/lib/news-config";

type Params = Promise<{ date: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  const digest = await getDigestByDate(date);
  if (!digest) return { title: "Digest Not Found" };
  return {
    title: digest.title,
    description: digest.summary.slice(0, 160),
  };
}

export default async function DigestPage({ params }: { params: Params }) {
  const { date } = await params;
  const [digest, t] = await Promise.all([
    getDigestByDate(date),
    getTranslations("News.digest"),
  ]);

  if (!digest) notFound();

  const sections = digest.sections as {
    category: string;
    categoryVi: string;
    headline: string;
    body: string;
    articleUrls: string[];
  }[];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-8">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 font-barlow text-sm text-white/70 hover:text-white mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("backToNews")}
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-lfc-gold" />
          <span className="font-barlow text-xs uppercase tracking-widest text-lfc-gold font-bold">
            {t("badge")}
          </span>
          <span className="font-inter text-xs text-stadium-muted ml-2">
            {new Date(date).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <h1 className="font-inter text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
          {digest.title}
        </h1>

        <blockquote className="font-inter text-lg text-white/60 leading-relaxed pl-5 border-l-4 border-lfc-red italic mb-10">
          {digest.summary}
        </blockquote>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, i) => {
            const catConfig = CATEGORY_CONFIG[section.category as keyof typeof CATEGORY_CONFIG];
            return (
              <div key={i} className="bg-stadium-surface border border-stadium-border/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  {catConfig && (
                    <span className={`font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${catConfig.color}`}>
                      {section.categoryVi}
                    </span>
                  )}
                </div>
                <h3 className="font-inter text-lg font-bold text-white mb-2">
                  {section.headline}
                </h3>
                <p className="font-inter text-sm text-white/70 leading-relaxed mb-3">
                  {section.body}
                </p>
                {section.articleUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {section.articleUrls.map((url, j) => (
                      <Link
                        key={j}
                        href={getArticleUrl(url)}
                        className="inline-flex items-center gap-1 font-barlow text-[10px] uppercase tracking-wider text-lfc-red hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t("sourceArticle", { n: j + 1 })}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="font-inter text-xs text-stadium-muted mt-10 text-center">
          {t("generatedBy", { model: digest.model })}
        </p>
      </div>
    </div>
  );
}
```

### Step 7: i18n keys (15m)

Add translation keys to `messages/en.json` and `messages/vi.json` under `News.digest`:
```json
{
  "badge": "AI Daily Digest",
  "dismiss": "Dismiss",
  "expand": "Read summary",
  "collapse": "Collapse",
  "readFull": "Read full digest",
  "articleCount": "From {count} articles",
  "backToNews": "Back to News",
  "sourceArticle": "Source #{n}",
  "generatedBy": "Generated by {model}"
}
```

## Todo

- [x] Run Supabase migration: create news_digests table + RLS
- [x] Create `src/lib/news/digest.ts` with generation logic
- [x] Create `/api/news/digest/generate` cron endpoint
- [x] Add cron schedule to `vercel.json`
- [x] Create `src/components/news/digest-card.tsx`
- [x] Update `src/app/news/page.tsx` to show pinned digest
- [x] Create `src/app/news/digest/[date]/page.tsx`
- [x] Add i18n keys for digest (en + vi)
- [x] Test: trigger digest generation manually, verify DB insertion
- [x] Test: verify pinned card shows on /news
- [x] Test: verify /news/digest/[date] renders correctly
- [x] Test: verify dismiss behavior persists in localStorage

## Success Criteria

- Digest generated daily at 7:00 AM VN (00:00 UTC)
- Digest visible on /news as pinned card (dismissible)
- /news/digest/[date] renders full digest with sections
- Generation completes in <30s
- Tokens used per digest: <2000 (within Groq free tier)
- Graceful fallback: if generation fails, /news works normally without digest card

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Groq rate limit during generation | Low | Medium | Single daily request; well within limits |
| AI outputs malformed JSON | Medium | Medium | Try/catch JSON.parse; retry once; log errors |
| No articles in last 24h (quiet news day) | Low | Low | Skip generation; don't show pinned card |
| Groq API down at cron time | Low | Medium | Retry next hour via manual trigger or next day |
| LLM hallucinating article content | Low | Medium | Prompt constrains to article titles/snippets only; links to real articles for verification |

## Security Considerations

- Generation endpoint protected by `CRON_SECRET`
- Groq API key is server-only (`process.env.GROQ_API_KEY`)
- Generated content is text-only (no HTML injection risk)
- news_digests table has RLS: public read-only, no write from client
- Article URLs in sections are validated against existing articles in DB

## Unresolved Questions

1. **Bilingual or Vietnamese-only?** Current design generates Vietnamese digest. Could add `language` column and generate both EN+VI. Recommend starting VI-only (80% of target audience), add EN later if demand.
2. **Digest for days with <3 articles?** Current design: skip generation. Alternative: generate "Quiet Day" format with brief summary. Start with skip.
3. **Email subscription for digest?** Requires email service (Resend, etc.). Out of scope for Phase 04. Could add as future enhancement.
4. **Should digest link back to internal article pages or original sources?** Current design: internal article pages (`getArticleUrl()`). This keeps users on site and benefits from Phase 01 content caching.

## Next Steps

After all 4 phases complete:
- Monitor sync_logs for per-source health (Phase 03)
- Monitor digest generation success via sync_logs or separate logging
- Consider adding Vercel Analytics to track digest engagement
- Evaluate whether to add email digest subscription based on usage
