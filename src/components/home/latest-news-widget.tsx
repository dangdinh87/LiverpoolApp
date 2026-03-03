import Link from "next/link";
import type { NewsArticle } from "@/lib/rss-parser";

interface LatestNewsWidgetProps {
  articles: NewsArticle[];
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LatestNewsWidget({ articles }: LatestNewsWidgetProps) {
  const top3 = articles.slice(0, 3);

  return (
    <div className="flex flex-col gap-3 p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          Latest News
        </span>
        <Link
          href="/news"
          className="font-barlow text-xs text-lfc-red hover:underline uppercase tracking-wider font-semibold"
        >
          All News
        </Link>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {top3.map((article, i) => (
          <a
            key={i}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="border-b border-stadium-border/50 pb-3 last:border-0 last:pb-0">
              <p className="font-inter text-sm text-white font-medium leading-tight group-hover:text-lfc-red transition-colors line-clamp-2 mb-1">
                {article.title}
              </p>
              <p className="font-inter text-xs text-stadium-muted">
                {formatRelativeDate(article.pubDate)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
