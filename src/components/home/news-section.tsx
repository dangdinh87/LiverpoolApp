import { getTranslations } from "next-intl/server";
import { DigestCard } from "@/components/news/digest-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import type { DigestRecord } from "@/lib/news/digest";
import type { NewsArticle } from "@/lib/news/types";
import { NewsHeadline } from "./news-card";

interface NewsSectionProps {
  /** Already selected for display, newest first. */
  articles: NewsArticle[];
  digest?: DigestRecord | null;
  locale: "vi" | "en";
}

/** "Tin nhanh": a short list of headline links to the stories, plus the daily digest. Server-rendered. */
export async function NewsSection({ articles, digest, locale }: NewsSectionProps) {
  const h = await getTranslations("Home.news");

  return (
    <section aria-label={h("title")} className="reveal reveal-delay-2">
      <SectionHeader title={h("title")} href="/news" linkLabel={h("viewAll")} />
      {articles.length === 0 ? (
        <EmptyState
          tone="error"
          title={h("emptyTitle")}
          description={h("emptyDescription")}
          actionHref="/news"
          actionLabel={h("emptyAction")}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="surface divide-y divide-[var(--line)] overflow-hidden">
            {articles.map((a) => (
              <li key={a.link}>
                <NewsHeadline article={a} locale={locale} />
              </li>
            ))}
          </ul>
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
