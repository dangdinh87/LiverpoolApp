import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { DataPulseStrip, PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { ArticleCard } from "@/components/site-articles/article-card";
import { listSiteArticles } from "@/lib/site-articles/db";
import { getFixtures } from "@/lib/football";
import { FOOTBALL_CACHE_TAG } from "@/lib/football/cache-tags";
import { requireNonEmptyArray } from "@/lib/football/fdo-client";
import { defaultTimeZoneForLocale, formatMatchDate } from "@/lib/format-match-date";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import type { LocaleParams } from "@/i18n/routing";
import type { SiteArticleContent } from "@/lib/site-articles/types";

export const revalidate = 21600;

const getCachedAnalysisArticles = unstable_cache(
  async () => {
    const rows = await listSiteArticles(30);
    if (rows.length === 0) {
      throw new Error("[analysis] empty site_articles response — not caching");
    }
    return rows;
  },
  ["analysis-list-v1"],
  { revalidate: 21600, tags: ["site-articles"] },
);

const getCachedAnalysisFixtures = unstable_cache(
  async () => requireNonEmptyArray(getFixtures()),
  ["analysis-fixtures-v1"],
  { revalidate: 21600, tags: [FOOTBALL_CACHE_TAG] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Analysis.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/analysis" }) };
}

export default async function AnalysisPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tHub, rows, fixtures, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Analysis" }),
    getTranslations({ locale, namespace: "Hub" }),
    getCachedAnalysisArticles().catch(() => []),
    getCachedAnalysisFixtures().catch(() => []),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "analysis", path: "/analysis" }]),
  ]);

  const articles = rows
    .map((row) => {
      const content =
        (locale === "vi" ? row.content_vi : row.content_en) ??
        row.content_en ??
        row.content_vi;
      return content ? { row, content: content as SiteArticleContent } : null;
    })
    .filter((x): x is { row: (typeof rows)[number]; content: SiteArticleContent } => x !== null);

  const reviewCount = articles.filter((a) => a.row.kind === "review").length;
  const previewCount = articles.filter((a) => a.row.kind === "preview").length;
  const uiLocale: "vi" | "en" = locale === "vi" ? "vi" : "en";
  const nextMatch =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;
  const latestMatch =
    nextMatch ??
    [...fixtures]
      .filter((f) => ["FT", "AET", "PEN"].includes(f.fixture.status.short))
      .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())[0] ??
    null;
  const matchOpp = latestMatch
    ? latestMatch.teams.home.id === 40
      ? latestMatch.teams.away
      : latestMatch.teams.home
    : null;

  return (
    <div className="min-h-screen bg-stadium-bg">
      <JsonLd data={breadcrumbJsonLd} />

      <PageHero
        clubCrest
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <SectionSubNav
        group="editorial"
        current="analysis"
      />

      <section aria-label={t("hero.title")} className="page-container pb-20 pt-8 sm:pt-10">
        <DataPulseStrip
          eyebrow={tHub("seasonPulse")}
          className="mb-8"
          items={[
            ...(articles.length > 0
              ? [
                  {
                    label: tHub("metrics.totalArticles"),
                    value: articles.length,
                    accent: "red" as const,
                  },
                ]
              : []),
            ...(reviewCount > 0
              ? [
                  {
                    label: tHub("metrics.matchReviews"),
                    value: reviewCount,
                    accent: "gold" as const,
                  },
                ]
              : []),
            ...(previewCount > 0
              ? [
                  {
                    label: tHub("metrics.matchPreviews"),
                    value: previewCount,
                    accent: "red" as const,
                  },
                ]
              : []),
            {
              label: nextMatch ? tHub("metrics.nextMatch") : tHub("nav.fixtures"),
              value: matchOpp
                ? `${latestMatch?.teams.home.id === 40 ? "vs" : "@"} ${matchOpp.name}`
                : tHub("nav.fixtures"),
              sublabel: latestMatch
                ? formatMatchDate(new Date(latestMatch.fixture.date), uiLocale, defaultTimeZoneForLocale(uiLocale))
                : tHub("cards.fixtures.badge"),
              href: latestMatch ? `/fixtures/${latestMatch.fixture.id}` : "/fixtures",
              accent: "gold",
            },
          ]}
        />

        {articles.length === 0 ? (
          <EmptyState title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map(({ row, content }) => (
              <li key={row.id}>
                <ArticleCard
                  as="h2"
                  article={{
                    slug: row.slug,
                    kind: row.kind,
                    title: content.title,
                    excerpt: content.excerpt,
                    publishedAt: row.match_date ?? row.published_at,
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        <PresetConnectedGrid preset="fromAnalysis" className="mt-12" />
      </section>
    </div>
  );
}
