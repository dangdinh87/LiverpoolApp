import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteArticleBySlug, listSiteArticles } from "@/lib/site-articles/db";
import { getHreflangAlternates, getLocalizedUrl, SCHEMA_IDS } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { LocalMatchDay } from "@/components/ui/local-time";
import { ArticleCard } from "@/components/site-articles/article-card";
import { BRAND } from "@/lib/brand";
import type { SiteArticleContent } from "@/lib/site-articles/types";

export const revalidate = 3600;

/**
 * Prerender every published article.
 *
 * Without this the route was `ƒ`: rendered on demand, in one region, for every
 * reader. These are the site's own articles and the reason anyone arrives from
 * search, so a visitor in Jakarta or Lagos should get them from the CDN edge,
 * not from a round trip to Singapore.
 *
 * Only `slug` is returned — the `[locale]` segment is enumerated by the layout
 * above. `dynamicParams` stays at its default, so an article published after
 * the build still renders on first request and is cached from then on, and
 * `listSiteArticles` already swallows a database error into `[]`, which leaves
 * the route behaving exactly as it did before rather than failing the build.
 */
export async function generateStaticParams() {
  return (await listSiteArticles(100)).map((row) => ({ slug: row.slug }));
}

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
  const alternates = getHreflangAlternates(`/analysis/${slug}`, locale);
  if (!content) return { title: "Not found", robots: { index: false } };

  return {
    title: content.metaTitle || content.title,
    description: content.metaDescription || content.excerpt,
    alternates,
    openGraph: {
      type: "article",
      title: content.metaTitle || content.title,
      description: content.metaDescription || content.excerpt,
      ...(row?.published_at && { publishedTime: row.published_at }),
      siteName: BRAND.name,
      // Declared rather than left to the file convention. Next builds that URL
      // from the matched `[locale]` segment, so the default locale came out as
      // /en/analysis/..., which is a 307 — a share image should not redirect.
      images: [{ url: `${alternates.canonical}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${alternates.canonical}/opengraph-image`],
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

  const url = getLocalizedUrl(`/analysis/${slug}`, locale);

  return (
    <article className="min-h-screen bg-stadium-bg pb-16 pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            // NewsArticle, not Article: these are match reports, and the more
            // specific type is the one news surfaces read.
            "@type": "NewsArticle",
            headline: content.title,
            description: content.excerpt,
            url,
            mainEntityOfPage: url,
            inLanguage: locale,
            // The share card this route generates. Article markup without an
            // image is the commonest reason a story is passed over.
            image: [`${url}/opengraph-image`],
            ...(row.published_at && { datePublished: row.published_at }),
            // Google asks for both dates; without a modified date it assumes
            // the article has never been touched since publication.
            ...((row.generated_at || row.published_at) && {
              dateModified: row.generated_at ?? row.published_at,
            }),
            author: { "@type": "Organization", name: BRAND.name },
            // Points at the single publisher entity declared site-wide rather
            // than restating it, so the two cannot describe the same thing
            // differently.
            publisher: { "@id": SCHEMA_IDS.publisher },
          },
          await buildLocalizedBreadcrumbJsonLd(locale, [
            { nav: "analysis", path: "/analysis" },
            { name: content.title, path: `/analysis/${slug}` },
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
