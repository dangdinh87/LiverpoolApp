import { Link } from "@/i18n/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { isHttpUrl } from "./news-text";

/** "Back to the roundup": 44px tall, first thing under the header. */
export function NewsBackLink({ label }: { label: string }) {
  return (
    <Link
      href="/news"
      className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}

/** Outlet name as a plain text badge: no outlet colours, no logos. */
export function SourceBadge({ name }: { name: string }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center border border-[var(--line-strong)] px-2 py-1 font-barlow text-xs font-bold uppercase tracking-wider text-white">
      {name}
    </span>
  );
}

/**
 * The primary action of every article page: go read the original.
 * Full width and 56px tall on phones; renders nothing for a non-http(s) link.
 */
export function OriginalLinkButton({ url, label, hint }: { url: string; label: string; hint?: string }) {
  if (!isHttpUrl(url)) return null;
  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 bg-lfc-red px-6 py-3 text-center font-barlow text-base font-semibold uppercase leading-tight tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark sm:w-auto"
      >
        {label}
        <ExternalLink className="size-[18px] shrink-0" aria-hidden />
      </a>
      {hint && <p className="mt-2.5 text-[13px] leading-snug text-stadium-muted">{hint}</p>}
    </div>
  );
}

/** Excerpt text in the shared reading typography (17-18px, 1.65 line height, ~68 characters per line). */
export function ArticleExcerpt({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="article-prose">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
