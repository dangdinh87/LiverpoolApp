import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Fixture } from "@/lib/types/football";
import { ArticleNextMatch } from "./article-end-sections";
import { isHttpUrl } from "./news-text";

interface ArticleSidebarProps {
  sourceName: string;
  sourceUrl: string;
  nextMatch?: Fixture | null;
}

/** Desktop-only rail (the page hides it under `lg`): source credit as plain text + next match. */
export async function ArticleSidebar({ sourceName, sourceUrl, nextMatch }: ArticleSidebarProps) {
  const t = await getTranslations("News.sidebar");

  return (
    <div className="sticky top-[calc(var(--header-h)+1rem)] space-y-4">
      <div className="surface space-y-2 p-4">
        <p className="section-label text-stadium-muted">{t("source")}</p>
        {isHttpUrl(sourceUrl) ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 font-barlow text-base font-bold uppercase tracking-wider text-white transition-colors hover:text-brand"
          >
            {sourceName}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center font-barlow text-base font-bold uppercase tracking-wider text-white">{sourceName}</span>
        )}
      </div>
      {nextMatch && <ArticleNextMatch fixture={nextMatch} />}
    </div>
  );
}
