import Image from "next/image";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  /** Optional background photo (keep ≤200KB). Decorative: gets alt="". */
  image?: string;
  /** Right-aligned extras (filters, season picker). */
  actions?: ReactNode;
  /**
   * A slim title bar for pages that are a list to read, not a landing: no photo
   * or eyebrow, a smaller title, the description from `sm` up, and `actions`
   * beside the title on phones too (~110px on a phone, ~130px on desktop, against ~190 and ~280).
   */
  compact?: boolean;
  /** Render the Liverpool FC club crest as a focal emblem & subtle backdrop on club/match heroes. */
  clubCrest?: boolean;
  className?: string;
}

/**
 * Shared page hero. Locked to a fixed height per breakpoint on non-compact
 * pages so sub-navigation bars sit at an identical Y coordinate across every
 * hub route; the only h1 on the page. Content is offset by the fixed header height.
 */
export function PageHero({
  title,
  eyebrow,
  description,
  image,
  actions,
  compact = false,
  clubCrest = false,
  className,
}: PageHeroProps) {
  return (
    <header
      className={cn(
        compact
          ? "relative isolate overflow-hidden border-b border-[var(--line)]"
          : "relative isolate flex h-[12.5rem] flex-col justify-end overflow-hidden border-b border-[var(--line)] sm:h-[14.25rem]",
        className,
      )}
    >
      {image && !compact && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover -z-20" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-stadium-bg/70 via-stadium-bg/80 to-stadium-bg" />
        </>
      )}
      {clubCrest && !compact && (
        <Image
          src="/assets/lfc/crest.webp"
          alt=""
          width={220}
          height={264}
          className="pointer-events-none select-none absolute right-6 top-1/2 -translate-y-1/2 -z-10 hidden w-44 opacity-[0.07] sm:block"
        />
      )}
      <div
        className={cn(
          "page-container",
          compact
            ? "pb-3 pt-[calc(var(--header-h)+0.75rem)] sm:pb-4 sm:pt-[calc(var(--header-h)+1.25rem)]"
            : "pb-5 pt-[var(--header-h)] sm:pb-6",
        )}
      >
        <div className={cn("flex gap-3 sm:items-end sm:justify-between sm:gap-4", compact ? "items-end justify-between" : "flex-col sm:flex-row")}>
          <div className={cn("min-w-0", clubCrest && !compact && "flex items-start gap-3.5 sm:items-center sm:gap-5")}>
            {clubCrest && !compact && (
              <Image
                src="/assets/lfc/crest.webp"
                alt=""
                width={52}
                height={62}
                className="mt-0.5 h-11 w-9 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.65)] sm:mt-0 sm:h-16 sm:w-[52px]"
              />
            )}
            <div className="min-w-0">
              {eyebrow && !compact && <p className="section-label text-brand mb-1 sm:mb-2">{eyebrow}</p>}
              <h1
                className={cn(
                  "font-bebas text-white text-balance",
                  compact ? "text-4xl leading-none sm:text-5xl" : "text-3xl sm:text-5xl leading-[1.06] line-clamp-2 sm:line-clamp-1",
                )}
              >
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    "max-w-3xl leading-snug text-stadium-muted",
                    compact
                      ? "mt-1.5 hidden text-sm sm:block"
                      : "mt-1.5 text-sm line-clamp-1 sm:mt-2 sm:text-[15px]",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            compact ? (
              <div className="shrink-0">{actions}</div>
            ) : (
              <div className="hidden shrink-0 items-center gap-2 lg:flex">{actions}</div>
            )
          )}
        </div>
      </div>
    </header>
  );
}

/** Fixed-height hero skeleton matching `PageHero` at every breakpoint for zero-jitter loading states. */
export function PageHeroSkeleton({ clubCrest = true, image }: { clubCrest?: boolean; image?: string }) {
  return (
    <header
      aria-hidden
      className="relative isolate flex h-[12.5rem] flex-col justify-end overflow-hidden border-b border-[var(--line)] sm:h-[14.25rem]"
    >
      {image && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-stadium-surface/50 via-stadium-bg/85 to-stadium-bg"
        />
      )}
      {clubCrest && (
        <Image
          src="/assets/lfc/crest.webp"
          alt=""
          width={220}
          height={264}
          className="pointer-events-none select-none absolute right-6 top-1/2 -translate-y-1/2 -z-10 hidden w-44 opacity-[0.04] sm:block"
        />
      )}
      <div className="page-container pb-5 pt-[var(--header-h)] sm:pb-6">
        <div className={cn("min-w-0", clubCrest && "flex items-start gap-3.5 sm:items-center sm:gap-5")}>
          {clubCrest && (
            <Skeleton className="mt-0.5 h-11 w-9 shrink-0 sm:mt-0 sm:h-16 sm:w-[52px]" />
          )}
          <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
            <Skeleton className="h-3 w-28 sm:w-36" />
            <Skeleton className="h-8 w-56 sm:h-12 sm:w-80" />
            <Skeleton className="h-3.5 w-64 max-w-full sm:h-4 sm:w-[28rem]" />
          </div>
        </div>
      </div>
    </header>
  );
}
