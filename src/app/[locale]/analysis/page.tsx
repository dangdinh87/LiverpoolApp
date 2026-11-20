import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleCard } from "@/components/site-articles/article-card";
import { listSiteArticles } from "@/lib/site-articles/db";
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

  const [t, rows, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Analysis" }),
    getCachedAnalysisArticles().catch(() => []),
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

  return (
    <div className="min-h-screen bg-stadium-bg pb-16">
      <JsonLd data={breadcrumbJsonLd} />

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <section aria-label={t("hero.title")} className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
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
      </section>
    </div>
  );
}
