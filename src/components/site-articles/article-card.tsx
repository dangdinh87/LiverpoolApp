import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LocalMatchDay } from "@/components/ui/local-time";
import type { SiteArticleKind } from "@/lib/site-articles/types";

export interface ArticleCardData {
  slug: string;
  kind: SiteArticleKind;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

/**
 * One article in the list.
 *
 * The whole card is the link — a card with a small link inside it is a smaller
 * target than the card suggests, and this list is read on a phone.
 */
export function ArticleCard({ article }: { article: ArticleCardData }) {
  const t = useTranslations("Analysis.kinds");
  const locale = useLocale();

  return (
    <Link
      href={`/analysis/${article.slug}`}
      className="surface tap-target group flex flex-col gap-2 p-4 transition-colors hover:border-white/25 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="section-label text-brand">{t(article.kind)}</span>
        {article.publishedAt && (
          <span className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">
            <LocalMatchDay iso={article.publishedAt} locale={locale === "vi" ? "vi" : "en"} withYear />
          </span>
        )}
      </div>
      <h3 className="font-bebas text-2xl leading-tight tracking-wide text-white group-hover:text-white sm:text-3xl">
        {article.title}
      </h3>
      <p className="line-clamp-2 text-sm leading-relaxed text-stadium-muted">{article.excerpt}</p>
    </Link>
  );
}
