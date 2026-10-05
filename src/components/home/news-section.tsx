import { getTranslations } from "next-intl/server";
import { DigestCard } from "@/components/news/digest-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import type { DigestRecord } from "@/lib/news/digest";
import type { ArticleCategory, NewsArticle } from "@/lib/news/types";
import { NewsCard } from "./news-card";

interface NewsSectionProps {
  /** Already selected for display: first = lead, the rest fill the list. */
  articles: NewsArticle[];
  digest?: DigestRecord | null;
  locale: "vi" | "en";
}

/** Top news: one lead story plus a compact list. Server-rendered. */
export async function NewsSection({ articles, digest, locale }: NewsSectionProps) {
  const t = await getTranslations("News");
  const h = await getTranslations("Home.news");
  const cat = await getTranslations("News.categories");

  const [lead, ...rest] = articles;
  const label = (c?: ArticleCategory) => (c && c !== "general" ? cat(c) : undefined);

  return (
    <section aria-label={t("title")} className="reveal reveal-delay-2">
      <SectionHeader
        eyebrow={t("tagline")}
        title={t("title")}
        href="/news"
        linkLabel={t("viewAll").replace(/\s*→\s*$/, "")}
      />
      {!lead ? (
        <EmptyState
          tone="error"
          title={h("emptyTitle")}
          description={h("emptyDescription")}
          actionHref="/news"
          actionLabel={h("emptyAction")}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          <NewsCard article={lead} variant="lead" locale={locale} categoryLabel={label(lead.category)} />
          {rest.length > 0 && (
            <div className="flex flex-col gap-2 sm:gap-3">
              {rest.map((a) => (
                <NewsCard key={a.link} article={a} variant="row" locale={locale} />
              ))}
            </div>
          )}
          {digest && (
            <DigestCard
              date={digest.digest_date}
              title={digest.title}
              summary={digest.summary}
              articleCount={digest.article_count}
              generatedAt={digest.generated_at}
            />
          )}
        </div>
      )}
    </section>
  );
}

const CATEGORY_ORDER: ArticleCategory[] = ["transfer", "match-report", "team-news", "injury", "analysis", "opinion"];

/** Below the fold: short lists per topic from the articles not already shown above. */
export async function NewsByCategory({ articles, locale }: { articles: NewsArticle[]; locale: "vi" | "en" }) {
  const h = await getTranslations("Home.news");
  const cat = await getTranslations("News.categories");

  const groups = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: articles.filter((a) => a.category === c && a.language === locale).slice(0, 3),
  }))
    // Fall back to any language so a sparse Vietnamese feed does not hide the section.
    .map((g) =>
      g.items.length >= 2 ? g : { ...g, items: articles.filter((a) => a.category === g.category).slice(0, 3) },
    )
    .filter((g) => g.items.length >= 2)
    .slice(0, 3);

  if (groups.length === 0) return null;

  return (
    <section aria-label={h("byCategory")} className="defer-render">
      <SectionHeader title={h("byCategory")} />
      <div className="grid gap-6 md:grid-cols-3 md:gap-8">
        {groups.map((g) => (
          <div key={g.category} className="min-w-0">
            <h3 className="section-label text-brand border-b border-[var(--line-strong)] pb-2">{cat(g.category)}</h3>
            <div className="divide-y divide-[var(--line)]">
              {g.items.map((a) => (
                <NewsCard key={a.link} article={a} variant="compact" locale={locale} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
