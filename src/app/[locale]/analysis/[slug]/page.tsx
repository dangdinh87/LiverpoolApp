import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteArticleBySlug, listSiteArticles } from "@/lib/site-articles/db";
import { getHreflangAlternates, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { LocalMatchDay } from "@/components/ui/local-time";
import { ArticleCard } from "@/components/site-articles/article-card";
import { BRAND } from "@/lib/brand";
import type { SiteArticleContent } from "@/lib/site-articles/types";

export const revalidate = 3600;

type Params = Promise<{ slug: string; locale: string }>;

/** The reader's language, falling back to whichever version exists. */
function pick(
  row: { content_en: SiteArticleContent | null; content_vi: SiteArticleContent | null },
  locale: string,
): SiteArticleContent | null {
  return (locale === "vi" ? row.content_vi : row.content_en) ?? row.content_en ?? row.content_vi;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, locale } = await params;
  const row = await getSiteArticleBySlug(slug);
  const content = row ? pick(row, locale) : null;
  if (!content) return { title: "Not found", robots: { index: false } };

  return {
    title: content.metaTitle || content.title,
    description: content.metaDescription || content.excerpt,
    alternates: getHreflangAlternates(`/analysis/${slug}`, locale),
    openGraph: {
      type: "article",
      title: content.metaTitle || content.title,
      description: content.metaDescription || content.excerpt,
      ...(row?.published_at && { publishedTime: row.published_at }),
      siteName: BRAND.name,
    },
  };
}

export default async function AnalysisArticlePage({ params }: { params: Params }) {
  const { slug, locale } = await params;
  const row = await getSiteArticleBySlug(slug);
  if (!row) notFound();
  const content = pick(row, locale);
  if (!content) notFound();

  const t = await getTranslations({ locale, namespace: "Analysis" });
  const related = (await listSiteArticles(4, row.kind))
    .filter((r) => r.slug !== row.slug)
    .slice(0, 3);

  const url = getCanonical(`/analysis/${slug}`);

  return (
    <article className="min-h-screen bg-stadium-bg pb-16 pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: content.title,
            description: content.excerpt,
            url,
            inLanguage: locale,
            ...(row.published_at && { datePublished: row.published_at }),
            author: { "@type": "Organization", name: BRAND.name },
            publisher: { "@type": "Organization", name: BRAND.name },
          },
          buildBreadcrumbJsonLd([
            { name: "Home", url: getCanonical("/") },
            { name: t("metadata.title"), url: getCanonical("/analysis") },
            { name: content.title, url },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[68ch] px-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="section-label text-brand">{t(`kinds.${row.kind}`)}</span>
          {(row.match_date ?? row.published_at) && (
            <span className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">
              <LocalMatchDay iso={(row.match_date ?? row.published_at) as string} locale={locale === "vi" ? "vi" : "en"} withYear />
            </span>
          )}
        </div>

        <h1 className="font-bebas text-4xl leading-[0.95] tracking-wide text-white sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-3 text-[17px] leading-[1.65] text-white/80">{content.excerpt}</p>

        {/* Said plainly, at the top, before anyone reads a word of it. */}
        <p className="mt-5 border-l-2 border-lfc-gold/50 pl-3 text-[13px] leading-relaxed text-stadium-muted">
          {t("disclosure.body", { brand: BRAND.name })}{" "}
          <Link href="/about" className="text-brand underline underline-offset-2">
            {t("disclosure.link")}
          </Link>
        </p>

        <div className="mt-8 space-y-7">
          {content.sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-bebas text-2xl tracking-wide text-white sm:text-3xl">
                {section.heading}
              </h2>
              <p className="mt-2 text-base leading-[1.7] text-white/85 sm:text-[17px]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {row.fixture_id && (
          <Link
            href={`/fixtures/${row.fixture_id}`}
            className="tap-target mt-10 inline-flex min-h-11 items-center border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:border-white/40"
          >
            {t("viewMatch")}
          </Link>
        )}

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="section-label mb-3 text-brand">{t("related")}</h2>
            <ul className="grid gap-3">
              {related.map((r) => {
                const c = pick(r, locale);
                return c ? (
                  <li key={r.id}>
                    <ArticleCard
                      article={{ slug: r.slug, kind: r.kind, title: c.title, excerpt: c.excerpt, publishedAt: r.match_date ?? r.published_at }}
                    />
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
