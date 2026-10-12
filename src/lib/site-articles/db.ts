import "server-only";
import { cache } from "react";
import { getServiceClient } from "@/lib/news/supabase-service";
import type { SiteArticleContent, SiteArticleKind } from "./types";

/**
 * Reads and writes for the site's own articles.
 *
 * Reads go through React.cache so a page that shows an article and its related
 * pieces makes one round trip, matching the news layer. Every read returns a
 * usable empty value on failure rather than throwing: a database outage should
 * cost the reader a section, not the page.
 */

export interface SiteArticleRow {
  id: string;
  slug: string;
  kind: SiteArticleKind;
  fixture_id: number | null;
  content_en: SiteArticleContent | null;
  content_vi: SiteArticleContent | null;
  status: "published" | "rejected";
  model: string | null;
  published_at: string | null;
  generated_at: string | null;
  /**
   * Kick-off of the match this is about, read out of the facts.
   *
   * A match report shows when the match was played, not when the text was
   * generated: a report published weeks later would otherwise be dated today,
   * which reads as a brand-new match.
   */
  match_date: string | null;
}

const COLUMNS =
  "id, slug, kind, fixture_id, content_en, content_vi, status, model, published_at, generated_at, facts";

/** Shape the row as callers use it, lifting the kick-off out of the facts. */
function toRow(raw: Record<string, unknown>): SiteArticleRow {
  const facts = raw.facts as { kickOff?: string } | null;
  const rest = { ...raw };
  delete rest.facts;
  return { ...(rest as unknown as SiteArticleRow), match_date: facts?.kickOff ?? null };
}

/** Published articles, newest first, optionally of one kind. */
export const listSiteArticles = cache(
  async (limit = 24, kind?: SiteArticleKind): Promise<SiteArticleRow[]> => {
    try {
      let query = getServiceClient()
        .from("site_articles")
        .select(COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit);
      if (kind) query = query.eq("kind", kind);

      const { data, error } = await query;
      if (error) {
        console.error("[site-articles] list:", error.message);
        return [];
      }
      // Sorted on the date the reader is shown, not the one the row is stored
      // by. The query orders on `published_at` (when the text was generated)
      // while every card prints `match_date` (when the match was played), so a
      // report written late landed above an older match: the list read
      // 10 Sep, 20 Sep, 5 Sep. Postgres cannot order on the coalesce without a
      // generated column, and these lists are short, so it is done here.
      return (data ?? [])
        .map((r) => toRow(r as Record<string, unknown>))
        .sort((a, b) => displayDate(b).localeCompare(displayDate(a)));
    } catch (err) {
      console.error("[site-articles] list failed:", err);
      return [];
    }
  },
);

/** The date a card prints for a row — see `match_date`. */
function displayDate(row: SiteArticleRow): string {
  return row.match_date ?? row.published_at ?? "";
}

/** One published article by slug. */
export const getSiteArticleBySlug = cache(
  async (slug: string): Promise<SiteArticleRow | null> => {
    try {
      const { data, error } = await getServiceClient()
        .from("site_articles")
        .select(COLUMNS)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) {
        console.error("[site-articles] bySlug:", error.message);
        return null;
      }
      return data ? toRow(data as Record<string, unknown>) : null;
    } catch (err) {
      console.error("[site-articles] bySlug failed:", err);
      return null;
    }
  },
);

/** Slugs and dates for the sitemap. */
export const getSiteArticleSitemapData = cache(
  async (): Promise<{ slug: string; published_at: string }[]> => {
    try {
      const { data } = await getServiceClient()
        .from("site_articles")
        .select("slug, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(500);
      return (data ?? []).filter(
        (r): r is { slug: string; published_at: string } => Boolean(r.slug && r.published_at),
      );
    } catch {
      return [];
    }
  },
);

/** Whether a fixture already has an article of this kind. */
export async function hasArticleForFixture(
  fixtureId: number,
  kind: SiteArticleKind,
): Promise<boolean> {
  try {
    const { data } = await getServiceClient()
      .from("site_articles")
      .select("id")
      .eq("fixture_id", fixtureId)
      .eq("kind", kind)
      .limit(1);
    return (data ?? []).length > 0;
  } catch {
    // Unknown means "do not generate": a duplicate article is worse than a gap.
    return true;
  }
}

/** Recent English bodies of one kind, for the repetition check. */
export async function recentBodies(kind: SiteArticleKind, limit = 5): Promise<string[]> {
  try {
    const { data } = await getServiceClient()
      .from("site_articles")
      .select("content_en")
      .eq("kind", kind)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? [])
      .map((r) => r.content_en as SiteArticleContent | null)
      .filter((c): c is SiteArticleContent => Boolean(c))
      .map((c) => c.sections.map((s) => s.body).join("\n"));
  } catch {
    return [];
  }
}

export interface SaveSiteArticle {
  slug: string;
  kind: SiteArticleKind;
  fixtureId?: number | null;
  contentEn: SiteArticleContent | null;
  contentVi: SiteArticleContent | null;
  facts: unknown;
  status: "published" | "rejected";
  rejectReason?: string | null;
  model?: string | null;
}

/** Store an article, published or rejected. Returns false when the write failed. */
export async function saveSiteArticle(article: SaveSiteArticle): Promise<boolean> {
  try {
    const { error } = await getServiceClient().from("site_articles").upsert(
      {
        slug: article.slug,
        kind: article.kind,
        fixture_id: article.fixtureId ?? null,
        content_en: article.contentEn,
        content_vi: article.contentVi,
        facts: article.facts,
        status: article.status,
        reject_reason: article.rejectReason ?? null,
        model: article.model ?? null,
        published_at: article.status === "published" ? new Date().toISOString() : null,
      },
      { onConflict: "slug" },
    );
    if (error) {
      console.error("[site-articles] save:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[site-articles] save failed:", err);
    return false;
  }
}
