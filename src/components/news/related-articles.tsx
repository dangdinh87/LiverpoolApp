import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, getArticleUrl } from "@/lib/news-config";
import { SectionHeader } from "@/components/ui/section-header";
import { cleanTitle, formatNewsDate } from "./news-text";

/**
 * Related headlines: text only (headline, then source and time), so the end of
 * an article never turns into a wall of thumbnails. Server component, no client JS.
 */
export async function RelatedArticles({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null;
  const [t, locale] = await Promise.all([getTranslations("News.related"), getLocale()]);
  const uiLocale = locale === "vi" ? "vi" : "en";
  const nowMs = new Date().getTime();

  return (
    <section className="mt-12 border-t border-[var(--line)] pt-8">
      <SectionHeader title={t("title")} />
      <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {articles.map((article) => {
          const meta = [SOURCE_CONFIG[article.source]?.label, formatNewsDate(article.pubDate, uiLocale, nowMs)]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={article.link}>
              <Link href={getArticleUrl(article.link)} className="group flex min-h-16 flex-col justify-center gap-1 py-3">
                <span className="line-clamp-3 font-inter text-base font-semibold leading-snug text-white decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline">
                  {cleanTitle(article.title)}
                </span>
                {meta && <span className="text-[13px] text-stadium-muted">{meta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
