import { ChevronDown, ExternalLink } from "lucide-react";
import type { NewsSource } from "@/lib/news/types";
import { CategoryTag } from "./category-tag";
import { NewsThumb } from "./news-thumb";

export interface DigestItemSource {
  url: string;
  title: string;
  sourceName: string;
}

export interface DigestItemImage {
  src: string;
  /** Detected outlet id, for the fallback tile when the picture fails to load. */
  source: NewsSource;
  /** Outlet name for the photo credit. */
  credit: string;
}

interface DigestItemProps {
  id: string;
  /** Position in the briefing, from 1. */
  number: number;
  /** Topic label ("Chuyển nhượng"); omitted when the category is unknown. */
  category?: string;
  categoryClass?: string;
  headline: string;
  paragraphs: string[];
  image?: DigestItemImage;
  sources: DigestItemSource[];
  labels: {
    /** "Sources" */
    sources: string;
    /** "+3" style suffix for outlets not named in the summary line. */
    more: (count: number) => string;
    /** "Photo: {source}" */
    photo: (source: string) => string;
    newTab: string;
  };
}

/** Outlets named in the collapsed sources line; the rest become "+n". */
const NAMED_OUTLETS = 2;

/**
 * One story of the daily digest: picture, number and topic, headline, a lead
 * paragraph and the rest of the text. The original articles sit behind a
 * single "Sources: Echo, Anfield Watch +3" line that opens into the list, so
 * five link-outs no longer outweigh the story itself. Server-rendered.
 */
export function DigestItem({ id, number, category, categoryClass, headline, paragraphs, image, sources, labels }: DigestItemProps) {
  const outlets = [...new Set(sources.map((s) => s.sourceName).filter(Boolean))];
  const named = outlets.slice(0, NAMED_OUTLETS).join(", ");
  const extra = outlets.length - NAMED_OUTLETS;

  return (
    <section id={id} className="scroll-mt-[calc(var(--header-h)+1.5rem)]">
      {image && (
        <figure className="relative mb-6 aspect-video overflow-hidden bg-[var(--surface-3)]">
          <NewsThumb src={image.src} source={image.source} sizes="(max-width: 768px) 100vw, 672px" />
          <figcaption className="absolute bottom-0 right-0 bg-black/60 px-2 py-1 text-[11px] text-white/75 backdrop-blur-sm">
            {labels.photo(image.credit)}
          </figcaption>
        </figure>
      )}

      <p className="mb-3 flex items-center gap-3">
        <span className="font-bebas text-3xl leading-none text-lfc-gold tabular-nums">{number}</span>
        {category && <CategoryTag label={category} className={categoryClass} />}
      </p>
      <h2 className="text-balance font-inter text-[24px] font-extrabold leading-[1.22] text-white sm:text-[28px]">{headline}</h2>

      <div className="article-prose mt-4 [&>p:first-child]:text-[1.1875rem] [&>p:first-child]:leading-[1.6] [&>p:first-child]:text-white sm:[&>p:first-child]:text-[1.25rem]">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {sources.length > 0 && (
        <details className="group mt-6 border-t border-[var(--line)] pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-stadium-muted transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
            <span className="font-semibold text-white/80">{labels.sources}:</span>
            <span className="min-w-0 truncate">
              {named}
              {extra > 0 && ` ${labels.more(extra)}`}
            </span>
            <ChevronDown className="ml-auto size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="mt-1 space-y-0.5">
            {sources.map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex min-h-11 items-start gap-3 py-2 text-[15px] leading-snug text-white/85 transition-colors hover:text-white"
                >
                  <span className="min-w-0 flex-1">
                    <span className="decoration-lfc-red decoration-2 underline-offset-4 group-hover/link:underline">{source.title}</span>
                    {source.sourceName && <span className="ml-2 text-[13px] text-stadium-muted">{source.sourceName}</span>}
                  </span>
                  <ExternalLink className="mt-1 size-3.5 shrink-0 text-stadium-muted" aria-hidden />
                  <span className="sr-only">{labels.newTab}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
