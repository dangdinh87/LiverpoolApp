import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Fixture } from "@/lib/types/football";
import { SOURCE_CONFIG, type NewsSource } from "@/lib/news-config";
import { ArticleNextMatch } from "./article-end-sections";
import { isHttpUrl } from "./news-text";

/** Fallback badge for hosts outside the source table. */
const UNKNOWN_SOURCE_COLOR = "bg-zinc-700 text-zinc-100";

interface ArticleSidebarProps {
  source: NewsSource | "unknown";
  sourceName: string;
  sourceUrl: string;
  nextMatch?: Fixture | null;
}

/** Desktop-only rail (the page hides it under `lg`): source credit + next match. */
export async function ArticleSidebar({ source, sourceName, sourceUrl, nextMatch }: ArticleSidebarProps) {
  const t = await getTranslations("News.sidebar");
  const color = (source === "unknown" ? undefined : SOURCE_CONFIG[source]?.color) ?? UNKNOWN_SOURCE_COLOR;

  return (
    <div className="sticky top-[calc(var(--header-h)+1rem)] space-y-4">
      <div className="surface space-y-3 p-4">
        <p className="section-label text-stadium-muted">{t("source")}</p>
        {isHttpUrl(sourceUrl) ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-10 items-center gap-2 px-3 font-barlow text-sm font-bold uppercase tracking-wider transition-[filter] hover:brightness-125 ${color}`}
          >
            {sourceName}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <span className={`inline-flex min-h-10 items-center px-3 font-barlow text-sm font-bold uppercase tracking-wider ${color}`}>{sourceName}</span>
        )}
      </div>
      {nextMatch && <ArticleNextMatch fixture={nextMatch} />}
    </div>
  );
}
