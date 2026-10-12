import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import type { NewsArticle } from "@/lib/news/types";
import { NewsHeadline, NewsLeadStory } from "./news-card";

interface NewsSectionProps {
  /** Already selected for display, newest first. */
  articles: NewsArticle[];
  locale: "vi" | "en";
}

/**
 * "Tin nhanh": the newest story as a lead with its picture, the next ones as
 * headline rows beside it (stacked on phones). Server-rendered.
 */
export async function NewsSection({ articles, locale }: NewsSectionProps) {
  const h = await getTranslations("Home.news");
  const [lead, ...rest] = articles;

  return (
    <section aria-label={h("title")} className="reveal reveal-delay-2">
      <SectionHeader title={h("title")} href="/news" linkLabel={h("viewAll")} />
      {!lead ? (
        <EmptyState
          tone="error"
          title={h("emptyTitle")}
          description={h("emptyDescription")}
          actionHref="/news"
          actionLabel={h("emptyAction")}
        />
      ) : (
        <div className="grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <NewsLeadStory article={lead} locale={locale} />
          {rest.length > 0 && (
            <ul className="divide-y divide-[var(--line)] bg-[var(--surface-2)]">
              {rest.map((a) => (
                <li key={a.link}>
                  <NewsHeadline article={a} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
