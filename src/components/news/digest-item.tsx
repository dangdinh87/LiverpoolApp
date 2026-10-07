import { ExternalLink } from "lucide-react";

export interface DigestItemSource {
  url: string;
  title: string;
  sourceName: string;
}

interface DigestItemProps {
  id: string;
  /** Topic label ("Chuyển nhượng"); omitted when the category is unknown. */
  category?: string;
  categoryClass?: string;
  headline: string;
  paragraphs: string[];
  sources: DigestItemSource[];
  sourcesLabel: string;
  newTabLabel: string;
}

/**
 * One story of the daily digest: topic, headline, a few short paragraphs, then
 * link-outs to the original articles (plain-text outlet names, new tab).
 * Server-rendered; no client JS.
 */
export function DigestItem({
  id,
  category,
  categoryClass,
  headline,
  paragraphs,
  sources,
  sourcesLabel,
  newTabLabel,
}: DigestItemProps) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)+1rem)] border-t border-[var(--line)] pt-7">
      {category && (
        <span className={`mb-3 inline-block px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider ${categoryClass ?? ""}`}>
          {category}
        </span>
      )}
      <h2 className="max-w-[42rem] text-balance font-inter text-[22px] font-extrabold leading-[1.25] text-white sm:text-2xl">{headline}</h2>
      <div className="article-prose mt-3">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {sources.length > 0 && (
        <div className="mt-5 max-w-[42rem]">
          <p className="section-label mb-1 text-stadium-muted">{sourcesLabel}</p>
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {sources.map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-14 items-center justify-between gap-3 py-2.5 text-white transition-colors hover:text-brand"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{source.title}</span>
                    {source.sourceName && <span className="mt-0.5 block text-[13px] text-stadium-muted">{source.sourceName}</span>}
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-stadium-muted group-hover:text-brand" aria-hidden />
                  <span className="sr-only">{newTabLabel}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
