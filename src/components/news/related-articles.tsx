import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { SectionHeader } from "@/components/ui/section-header";
import { NewsThumb } from "./news-thumb";
import { cleanTitle, formatNewsDate } from "./news-text";

/**
 * Related stories: a swipeable strip on phones (snap, no page-width overflow),
 * a grid from `sm` up. Server component: no client JS.
 */
export async function RelatedArticles({
  articles,
  title,
  eyebrow,
  href,
  linkLabel,
}: {
  articles: NewsArticle[];
  /** Defaults to "Related news". */
  title?: string;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  const t = await getTranslations("News.related");
  const nowMs = new Date().getTime();

  return (
    <section className="mt-12 border-t border-[var(--line)] pt-8">
      <SectionHeader title={title ?? t("title")} eyebrow={eyebrow} href={href} linkLabel={linkLabel} />
      <ul className="scroll-x -mx-4 flex snap-x snap-mandatory gap-3 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {articles.map((article) => {
          const source = SOURCE_CONFIG[article.source];
          return (
            <li key={article.link} className="w-[260px] shrink-0 snap-start sm:w-auto">
              <Link href={getArticleUrl(article.link)} className="group surface-interactive block h-full overflow-hidden">
                <div className="relative aspect-video bg-[var(--surface-3)]">
                  <NewsThumb src={article.thumbnail ?? article.heroImage} source={article.source} sizes="(max-width: 640px) 260px, (max-width: 1024px) 50vw, 360px" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    {source && (
                      <span className={`font-barlow text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${source.color}`}>{source.label}</span>
                    )}
                    <span className="text-xs text-stadium-muted">{formatNewsDate(article.pubDate, article.language, nowMs)}</span>
                  </div>
                  <p className="line-clamp-3 font-inter text-[15px] font-bold leading-snug text-white group-hover:underline decoration-lfc-red decoration-2 underline-offset-4">
                    {cleanTitle(article.title)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
