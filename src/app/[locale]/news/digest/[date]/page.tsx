import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllDigestDates, getDigestByDate, getSeoArticleFromDigest, getVisibleDigestSections } from "@/lib/news/digest";
import { getArticleTitlesByUrls } from "@/lib/news";
import { detectSource } from "@/lib/news/source-detect";
import { CATEGORY_CONFIG, SOURCE_CONFIG } from "@/lib/news-config";
import { makePageMeta, buildBreadcrumbJsonLd, buildNewsArticleJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import "@/components/news/article-reader.css";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { DigestNav } from "@/components/news/digest-nav";
import { DigestItem, type DigestItemSource } from "@/components/news/digest-item";
import { NewsBackLink } from "@/components/news/article-parts";
import { EmptyState } from "@/components/ui/empty-state";
import { chunkSentences, cleanTitle, isHttpUrl, keepDatesTogether, leadSentences } from "@/components/news/news-text";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { BRAND } from "@/lib/brand";

type Params = Promise<{ date: string; locale: string }>;

export const revalidate = 3600;

// Empty list = nothing prerendered at build, each path is rendered on first
// request and then cached for `revalidate` (without it the route renders per request).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { date, locale } = await params;
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
      locale,
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
  const { date, locale } = await params;
  setRequestLocale(locale);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [digest, dates, t, tNews] = await Promise.all([
    getDigestByDate(date),
    getAllDigestDates(),
    getTranslations("News.digest"),
    getTranslations("News"),
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
          <NewsBackLink label={t("backToNews")} />
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

  const uiLocale = locale === "vi" ? "vi" : "en";
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
  // A short intro, not the whole summary: the items below carry the detail.
  const intro = leadSentences(seoArticle?.excerpt || digest.summary, 230);
  const meta = [
    digest.article_count > 0 ? t("articleCount", { count: digest.article_count }) : null,
    digest.generated_at ? t("generatedAt", { time: formatMatchTime(new Date(digest.generated_at), defaultTimeZoneForLocale(uiLocale)) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Fetch titles for all source URLs across all sections
  const allUrls = sections.flatMap((s) => s.articleUrls);
  const titleMap = await getArticleTitlesByUrls(allUrls);

  const sourcesOf = (urls: string[]): DigestItemSource[] =>
    urls.filter(isHttpUrl).map((url, i) => {
      const detected = detectSource(url);
      const sourceName = (detected.id !== "unknown" && SOURCE_CONFIG[detected.id]?.label) || detected.name;
      return { url, sourceName, title: titleMap[url] ? cleanTitle(titleMap[url]) : t("sourceArticle", { n: i + 1 }) };
    });

  return (
    <article className="min-h-screen">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: tNews("breadcrumb.home"), url: getCanonical("/") },
          { name: tNews("title"), url: getCanonical("/news") },
          { name: "Liverpool Daily", url: getCanonical(`/news/digest/${date}`) },
        ]),
        buildNewsArticleJsonLd({
          title: displayTitle,
          description: displayDescription,
          url: getCanonical(`/news/digest/${date}`),
          publishedAt: digest.generated_at,
          sourceName: seoArticle?.sourceName,
        }),
      ]} />

      <div className="page-container max-w-3xl pb-20 pt-[calc(var(--header-h)+1rem)]">
        <NewsBackLink label={t("backToNews")} />

        <header className="reveal mt-2">
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <SiteArticleBadge label={t("proBadge", { brand: BRAND.name })} />
            <span className="text-sm text-stadium-muted">{formatMatchDayMonth(digestDate, uiLocale, true)}</span>
          </div>
          <h1 className="max-w-3xl text-balance font-bebas text-[36px] font-normal leading-[1.05] tracking-wide text-white sm:text-5xl lg:text-6xl">
            {keepDatesTogether(displayTitle)}
          </h1>
          {meta && <p className="mt-3 text-sm text-stadium-muted">{meta}</p>}
        </header>

        {intro && (
          <p className="mt-6 max-w-[42rem] border-l-4 border-lfc-red pl-4 text-[17px] leading-[1.6] text-white/90 sm:text-xl">{intro}</p>
        )}

        {sections.length > 0 ? (
          <div className="mt-9 space-y-9">
            {sections.map((section, i) => {
              const catConfig = CATEGORY_CONFIG[section.category as keyof typeof CATEGORY_CONFIG];
              return (
                <DigestItem
                  key={i}
                  id={`tin-${i + 1}`}
                  category={catConfig ? (uiLocale === "vi" ? section.categoryVi : catConfig.label) : undefined}
                  categoryClass={catConfig?.color}
                  headline={section.headline}
                  paragraphs={chunkSentences(section.body)}
                  sources={sourcesOf(section.articleUrls)}
                  sourcesLabel={t("sourcesLabel")}
                  newTabLabel={t("opensNewTab")}
                />
              );
            })}
          </div>
        ) : (
          // No itemised stories (older or partial digest): fall back to the long-form text.
          <div className="article-prose mt-9">
            {seoArticle ? (
              seoArticle.body.map((section, i) => (
                <section key={`${section.heading}-${i}`}>
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph, j) => (
                    <p key={j}>{paragraph}</p>
                  ))}
                </section>
              ))
            ) : (
              chunkSentences(digest.summary).map((paragraph, i) => <p key={i}>{paragraph}</p>)
            )}
          </div>
        )}

        <DigestNav prev={prev} next={next} />

        <p className="mt-10 max-w-[42rem] text-[13px] leading-relaxed text-stadium-muted">{t("aiNote")}</p>
      </div>
    </article>
  );
}
