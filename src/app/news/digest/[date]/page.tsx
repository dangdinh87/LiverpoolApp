import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAllDigestDates, getDigestByDate, getSeoArticleFromDigest, getVisibleDigestSections } from "@/lib/news/digest";
import { getArticleTitlesByUrls } from "@/lib/news";
import { CATEGORY_CONFIG, getArticleUrl } from "@/lib/news-config";
import { makePageMeta, buildBreadcrumbJsonLd, buildNewsArticleJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import "@/components/news/article-reader.css";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { DigestNav } from "@/components/news/digest-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { cleanTitle } from "@/components/news/news-text";
import { formatMatchDayMonth } from "@/lib/format-match-date";

type Params = Promise<{ date: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { title: "Digest Not Found", robots: { index: false } };
  const digest = await getDigestByDate(date);
  if (!digest) return { title: "Digest Not Found", robots: { index: false } };
  const description =
    digest.seo_description ||
    getSeoArticleFromDigest(digest)?.metaDescription ||
    digest.summary.slice(0, 160);
  const title = digest.seo_title || getSeoArticleFromDigest(digest)?.metaTitle || digest.title;
  const digestPath = `/news/digest/${date}`;
  return {
    title,
    description,
    ...makePageMeta(title, description, {
      path: digestPath,
      type: "article",
      publishedTime: digest.generated_at,
    }),
  };
}

export default async function DigestPage({
  params,
}: {
  params: Params;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [digest, dates, t, locale] = await Promise.all([
    getDigestByDate(date),
    getAllDigestDates(),
    getTranslations("News.digest"),
    getLocale(),
  ]);

  // Dates arrive newest first: the next index is the previous (older) briefing.
  const at = dates.findIndex((d) => d.digest_date === date);
  const prev = at >= 0 ? dates[at + 1]?.digest_date : dates.find((d) => d.digest_date < date)?.digest_date;
  const next = at > 0 ? dates[at - 1]?.digest_date : at < 0 ? [...dates].reverse().find((d) => d.digest_date > date)?.digest_date : undefined;
  const latest = dates[0]?.digest_date;

  if (!digest) {
    return (
      <div className="min-h-screen">
        <div className="page-container max-w-3xl pb-16 pt-[calc(var(--header-h)+1rem)]">
          <Link
            href="/news"
            className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToNews")}
          </Link>
          <div className="mt-4">
            <EmptyState
              icon={<Newspaper className="size-10" aria-hidden />}
              title={t("notGeneratedTitle")}
              description={t("notGeneratedDesc")}
              actionHref={latest ? `/news/digest/${latest}` : "/news"}
              actionLabel={latest ? t("openLatest") : t("backToNews")}
            />
          </div>
          <DigestNav prev={prev} next={next} />
        </div>
      </div>
    );
  }

  const sections = getVisibleDigestSections(digest.sections as {
    category: string;
    categoryVi: string;
    headline: string;
    body: string;
    articleUrls: string[];
  }[]);
  const seoArticle = getSeoArticleFromDigest(digest);
  const displayTitle = cleanTitle(seoArticle?.title || digest.title);
  const displayDescription =
    seoArticle?.metaDescription || seoArticle?.excerpt || digest.summary.slice(0, 160);
  const digestDate = new Date(`${date}T00:00:00+07:00`);

  // Fetch titles for all source URLs across all sections
  const allUrls = sections.flatMap((s) => s.articleUrls);
  const titleMap = await getArticleTitlesByUrls(allUrls);

  return (
    <article className="min-h-screen">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "News", url: getCanonical("/news") },
          { name: "Daily Digest", url: getCanonical(`/news/digest/${date}`) },
        ]),
        buildNewsArticleJsonLd({
          title: displayTitle,
          description: displayDescription,
          url: getCanonical(`/news/digest/${date}`),
          publishedAt: digest.generated_at,
          sourceName: seoArticle?.sourceName,
        }),
      ]} />

      <div className="page-container max-w-3xl pb-16 pt-[calc(var(--header-h)+1rem)]">
        <Link
          href="/news"
          className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToNews")}
        </Link>

        <header className="reveal mt-2">
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <SiteArticleBadge label={t("proBadge")} />
            <span className="text-sm text-stadium-muted">
              {formatMatchDayMonth(digestDate, locale === "vi" ? "vi" : "en", true)}
            </span>
          </div>
          <h1 className="max-w-3xl text-balance font-bebas text-[40px] font-normal leading-[1.02] tracking-wide text-white sm:text-5xl lg:text-6xl">
            {displayTitle}
          </h1>
          <p className="mt-3 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted">
            {t("by", { author: t("author") })}{digest.article_count > 0 ? ` · ${t("articleCount", { count: digest.article_count })}` : ""}
          </p>
        </header>

        <div className="mt-8">
          {seoArticle ? (
            <div className="article-prose">
              <p className="border-l-4 border-lfc-red pl-4 text-lg leading-relaxed text-stadium-muted sm:text-xl">
                {seoArticle.excerpt}
              </p>
              {seoArticle.body.map((section, i) => (
                <section key={`${section.heading}-${i}`}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </section>
              ))}
              {seoArticle.conclusion && (
                <p className="border-t border-[var(--line)] pt-6 text-white">{seoArticle.conclusion}</p>
              )}
            </div>
          ) : (
            <p className="max-w-3xl border-l-4 border-lfc-red pl-4 text-lg leading-relaxed text-stadium-muted sm:text-xl">
              {digest.summary}
            </p>
          )}
        </div>

        {sections.length > 0 && (
          <section className="mt-12 border-t border-[var(--line)] pt-8">
            <p className="section-label mb-2 text-brand">{t("sourceDigestTitle")}</p>
            {seoArticle && <p className="mb-6 text-[15px] leading-relaxed text-stadium-muted">{digest.summary}</p>}

            <div className="space-y-4">
              {sections.map((section, i) => {
                const catConfig = CATEGORY_CONFIG[section.category as keyof typeof CATEGORY_CONFIG];
                return (
                  <div key={i} className="surface p-5">
                    {catConfig && (
                      <span className={`mb-3 inline-block px-1.5 py-0.5 font-barlow text-[11px] font-bold uppercase tracking-wider ${catConfig.color}`}>
                        {locale === "vi" ? section.categoryVi : catConfig.label}
                      </span>
                    )}
                    <h2 className="font-inter text-lg font-bold leading-snug text-white">{section.headline}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-stadium-muted">{section.body}</p>
                    {section.articleUrls.length > 0 && (
                      <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                        {section.articleUrls.map((url, j) => (
                          <li key={j}>
                            <Link
                              href={getArticleUrl(url)}
                              className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-white transition-colors hover:text-brand"
                            >
                              <span className="line-clamp-2">{titleMap[url] ? cleanTitle(titleMap[url]) : t("sourceArticle", { n: j + 1 })}</span>
                              <ArrowRight className="size-4 shrink-0 text-stadium-muted" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <DigestNav prev={prev} next={next} />

        <p className="mt-10 text-center text-xs text-stadium-muted">{t("generatedBy")}</p>
      </div>
    </article>
  );
}
