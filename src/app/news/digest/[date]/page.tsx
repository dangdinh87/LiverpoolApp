import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDigestByDate } from "@/lib/news/digest";
import { getArticleTitlesByUrls } from "@/lib/news";
import { CATEGORY_CONFIG, getArticleUrl } from "@/lib/news-config";
import { makePageMeta, buildBreadcrumbJsonLd, buildNewsArticleJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

type Params = Promise<{ date: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { title: "Digest Not Found" };
  const digest = await getDigestByDate(date);
  if (!digest) return { title: "Digest Not Found" };
  const description = digest.summary.slice(0, 160);
  const digestPath = `/news/digest/${date}`;
  return {
    title: digest.title,
    description,
    ...makePageMeta(digest.title, description, {
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

  // Fetch titles for all source URLs across all sections
  const allUrls = sections.flatMap((s) => s.articleUrls);
  const titleMap = await getArticleTitlesByUrls(allUrls);

  return (
    <div className="min-h-screen">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "News", url: getCanonical("/news") },
          { name: "Daily Digest", url: getCanonical(`/news/digest/${date}`) },
        ]),
        buildNewsArticleJsonLd({
          title: digest.title,
          description: digest.summary.slice(0, 160),
          url: getCanonical(`/news/digest/${date}`),
          publishedAt: digest.generated_at,
        }),
      ]} />
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
            {new Date(date).toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
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
            const catConfig =
              CATEGORY_CONFIG[
                section.category as keyof typeof CATEGORY_CONFIG
              ];
            return (
              <div
                key={i}
                className="bg-stadium-surface border border-stadium-border/50 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  {catConfig && (
                    <span
                      className={`font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${catConfig.color}`}
                    >
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
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-stadium-border/40">
                    {section.articleUrls.map((url, j) => {
                      const articleTitle = titleMap[url];
                      return (
                        <Link
                          key={j}
                          href={getArticleUrl(url)}
                          className="inline-flex items-start gap-1.5 font-inter text-xs text-stadium-muted hover:text-lfc-red transition-colors group"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 group-hover:text-lfc-red" />
                          <span className="line-clamp-1">
                            {articleTitle ?? t("sourceArticle", { n: j + 1 })}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="font-inter text-xs text-stadium-muted mt-10 text-center">
          {t("generatedBy")}
        </p>
      </div>
    </div>
  );
}
