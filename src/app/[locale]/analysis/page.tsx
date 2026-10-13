import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { ArticleCard } from "@/components/site-articles/article-card";
import { listSiteArticles } from "@/lib/site-articles/db";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import type { LocaleParams } from "@/i18n/routing";
import type { SiteArticleContent } from "@/lib/site-articles/types";

export const revalidate = 900;

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Analysis.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/analysis" }) };
}

export default async function AnalysisPage({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Analysis" });
  const rows = await listSiteArticles(30);

  const articles = rows
    .map((row) => {
      // Fall back to the other language rather than hiding the piece: a reader
      // would rather have the English one than an empty page.
      const content = (locale === "vi" ? row.content_vi : row.content_en) ??
        row.content_en ?? row.content_vi;
      return content ? { row, content: content as SiteArticleContent } : null;
    })
    .filter((x): x is { row: (typeof rows)[number]; content: SiteArticleContent } => x !== null);

  return (
    <div className="min-h-screen bg-stadium-bg pb-16">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [
        { nav: "analysis", path: "/analysis" },
      ])} />

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {articles.length === 0 ? (
          <EmptyState title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {articles.map(({ row, content }) => (
              <li key={row.id}>
                <ArticleCard
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
      </div>
    </div>
  );
}
