import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllDigestDates, getDigestByDate, getSeoArticleFromDigest, getVisibleDigestSections } from "@/lib/news/digest";
import { getArticleRefsByUrls } from "@/lib/news";
import { detectSource } from "@/lib/news/source-detect";
import { CATEGORY_CONFIG, SOURCE_CONFIG } from "@/lib/news-config";
import type { NewsSource } from "@/lib/news/types";
import { makePageMeta, buildNewsArticleJsonLd, getHreflangAlternates, getLocalizedUrl } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import "@/components/news/article-reader.css";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { DigestNav } from "@/components/news/digest-nav";
import { DigestItem, type DigestItemImage, type DigestItemSource } from "@/components/news/digest-item";
import { DigestToc } from "@/components/news/digest-toc";
import { NewsThumb } from "@/components/news/news-thumb";
import { NewsBackLink } from "@/components/news/article-parts";
import { EmptyState } from "@/components/ui/empty-state";
import { chunkSentences, cleanTitle, isHttpUrl, keepDatesTogether, leadSentences } from "@/components/news/news-text";
import { formatMatchDayMonth } from "@/lib/format-match-date";
import { LocalTimeOfDay } from "@/components/ui/local-time";
import { BRAND } from "@/lib/brand";

type Params = Promise<{ date: string; locale: string }>;

// A dated briefing never changes once written.
export const revalidate = 86400;

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
      // Without this every briefing shared the one generic brand card, so
      // ninety different days looked identical in a link preview. Built from
      // the canonical rather than left to the file convention, which would
      // have emitted the /en-prefixed URL and that redirects.
      image: `${getHreflangAlternates(digestPath, locale).canonical}/opengraph-image`,
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

  const [digest, dates, t, tNews, tCat] = await Promise.all([
    getDigestByDate(date),
    getAllDigestDates(),
    getTranslations("News.digest"),
    getTranslations("News"),
    // Category labels come from the catalogue, not from the model.
    getTranslations("News.categories"),
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
  // Nodes, not strings: the time renders in the viewer's own zone rather than
  // being printed server-side and labelled from the interface language.
  const meta: React.ReactNode[] = [
    digest.article_count > 0 ? t("articleCount", { count: digest.article_count }) : null,
    digest.generated_at
      ? t.rich("generatedAt", {
          t: () => <LocalTimeOfDay iso={digest.generated_at!} locale={uiLocale} />,
        })
      : null,
  ].filter(Boolean);

  // Titles and pictures for every source link across the stories.
  const refs = await getArticleRefsByUrls(sections.flatMap((s) => s.articleUrls));

  const outletName = (url: string) => {
    const detected = detectSource(url);
    return (detected.id !== "unknown" && SOURCE_CONFIG[detected.id]?.label) || detected.name;
  };

  const sourcesOf = (urls: string[]): DigestItemSource[] =>
    urls.filter(isHttpUrl).map((url, i) => ({
      url,
      sourceName: outletName(url),
      title: refs[url] ? cleanTitle(refs[url].title) : t("sourceArticle", { n: i + 1 }),
    }));

  // One picture per story: the first source that has one and has not been used
  // by an earlier story, so the page never shows the same photo twice.
  const usedImages = new Set<string>();
  const images: (DigestItemImage | undefined)[] = sections.map((section) => {
    for (const url of section.articleUrls) {
      const src = refs[url]?.image;
      if (!isHttpUrl(src) || usedImages.has(src)) continue;
      usedImages.add(src);
      const detected = detectSource(url);
      return { src, source: (detected.id === "unknown" ? "bbc" : detected.id) as NewsSource, credit: outletName(url) };
    }
    return undefined;
  });
  // The first story's picture leads the page; that story then goes without one.
  const heroImage = images[0];

  const itemLabels = {
    sources: t("sourcesShort"),
    more: (count: number) => t("moreSources", { count }),
    photo: (source: string) => t("photoCredit", { source }),
    newTab: t("opensNewTab"),
  };
  const tocItems = sections.map((section, i) => ({ id: `tin-${i + 1}`, headline: section.headline }));

  return (
    <article className="min-h-screen">
      <JsonLd data={[
        await buildLocalizedBreadcrumbJsonLd(locale, [
          { name: tNews("title"), path: "/news" },
          { name: cleanTitle(digest.title), path: `/news/digest/${date}` },
        ]),
        buildNewsArticleJsonLd({
          title: displayTitle,
          description: displayDescription,
          url: getLocalizedUrl(`/news/digest/${date}`, locale),
          inLanguage: locale,
          publishedAt: digest.generated_at,
          sourceName: seoArticle?.sourceName,
          // This briefing's own share card, not the lead story's photo: that
          // photo belongs to the outlet that ran the story.
          image: `${getLocalizedUrl(`/news/digest/${date}`, locale)}/opengraph-image`,
        }),
      ]} />

      {/* ─── Masthead: the lead story's photo behind date, title and intro ─── */}
      <header className="relative isolate">
        {heroImage && (
          <div className="absolute inset-x-0 top-0 -z-10 h-[min(78vh,640px)] overflow-hidden">
            <NewsThumb src={heroImage.src} source={heroImage.source} sizes="100vw" priority />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/80 to-stadium-bg/30" />
          </div>
        )}
        <div
          className={
            heroImage
              ? "page-container flex min-h-[min(78vh,640px)] flex-col justify-end pb-8 pt-[calc(var(--header-h)+1rem)]"
              : "page-container pb-2 pt-[calc(var(--header-h)+1rem)]"
          }
        >
          <div className="mb-auto">
            <NewsBackLink label={t("backToNews")} />
          </div>
          <div className="reveal max-w-4xl">
            <div className="mb-4 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
              <SiteArticleBadge label={t("proBadge", { brand: BRAND.name })} />
              <span className="text-sm text-white/65">{formatMatchDayMonth(digestDate, uiLocale, true)}</span>
            </div>
            <h1 className="text-balance font-bebas text-[40px] font-normal leading-[1.02] tracking-wide text-white sm:text-6xl lg:text-7xl">
              {keepDatesTogether(displayTitle)}
            </h1>
            {intro && <p className="mt-5 max-w-[42rem] text-[17px] leading-[1.6] text-white/90 sm:text-xl">{intro}</p>}
            <p className="mt-4 text-sm text-stadium-muted">
              {[sections.length > 0 ? t("storyCount", { count: sections.length }) : null, ...meta]
                .filter(Boolean)
                .map((part, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {part}
                  </span>
                ))}
            </p>
            {heroImage && <p className="mt-1 text-xs text-white/50">{t("photoCredit", { source: heroImage.credit })}</p>}
          </div>
        </div>
      </header>

      <div className="page-container pb-20">
        {sections.length > 0 ? (
          <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[15rem_minmax(0,42rem)] lg:justify-center lg:gap-16">
            <aside className="hidden lg:block">
              <div className="sticky top-[calc(var(--header-h)+2rem)]">
                <DigestToc items={tocItems} label={t("inThisBriefing")} />
              </div>
            </aside>

            <div className="min-w-0">
              <div className="space-y-16 sm:space-y-20">
                {sections.map((section, i) => {
                  const catConfig = CATEGORY_CONFIG[section.category as keyof typeof CATEGORY_CONFIG];
                  return (
                    <DigestItem
                      key={i}
                      id={`tin-${i + 1}`}
                      number={i + 1}
                      category={catConfig ? tCat(section.category) : undefined}
                      categoryClass={catConfig?.color}
                      headline={section.headline}
                      paragraphs={chunkSentences(section.body)}
                      image={i === 0 ? undefined : images[i]}
                      sources={sourcesOf(section.articleUrls)}
                      labels={itemLabels}
                    />
                  );
                })}
              </div>

              <DigestNav prev={prev} next={next} />
              <p className="mt-10 max-w-[42rem] text-[13px] leading-relaxed text-stadium-muted">{t("aiNote")}</p>
            </div>
          </div>
        ) : (
          // No itemised stories (older or partial digest): fall back to the long-form text.
          <div className="mx-auto max-w-[42rem]">
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
            <DigestNav prev={prev} next={next} />
            <p className="mt-10 text-[13px] leading-relaxed text-stadium-muted">{t("aiNote")}</p>
          </div>
        )}
      </div>
    </article>
  );
}
