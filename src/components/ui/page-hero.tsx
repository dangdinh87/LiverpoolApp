import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  eyebrow?: string;
  description?: string;
  /** Optional background photo (keep ≤200KB). Decorative: gets alt="". */
  image?: string;
  /** Right-aligned extras (filters, season picker). Stacks under the title on mobile. */
  actions?: ReactNode;
  /**
   * A slim title bar for pages that are a list to read, not a landing: no photo
   * or eyebrow, a smaller title, the description from `sm` up, and `actions`
   * beside the title on phones too (~110px on a phone, ~130px on desktop, against ~190 and ~280).
   */
  compact?: boolean;
  className?: string;
}

/**
 * Shared page hero. Compact on phones so content starts above the fold; the
 * only h1 on the page. Content is offset by the fixed header height.
 *
 * Phone budget (390px): header 56 + 12 gap + eyebrow 16 + h1 34 + description
 * (clamped to 2 lines) + 16 bottom = ~170px with a one-line description,
 * ~190px with two (was 211-256px: 48px title, 24px top gap, 3-line copy).
 */
export function PageHero({ title, eyebrow, description, image, actions, compact = false, className }: PageHeroProps) {
  return (
    <header className={cn("relative isolate overflow-hidden border-b border-[var(--line)]", className)}>
      {image && !compact && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover -z-20" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-stadium-bg/70 via-stadium-bg/80 to-stadium-bg" />
        </>
      )}
      <div
        className={cn(
          "page-container pt-[calc(var(--header-h)+0.75rem)]",
          compact ? "pb-3 sm:pb-4 sm:pt-[calc(var(--header-h)+1.25rem)]" : "pb-4 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]",
        )}
      >
        <div className={cn("flex gap-3 sm:items-end sm:justify-between sm:gap-4", compact ? "items-end justify-between" : "flex-col sm:flex-row")}>
          <div className="min-w-0 reveal">
            {eyebrow && !compact && <p className="section-label text-brand mb-1 sm:mb-2">{eyebrow}</p>}
            <h1
              className={cn(
                "font-bebas text-white text-balance",
                compact ? "text-4xl leading-none sm:text-5xl" : "text-4xl sm:text-6xl lg:text-7xl leading-[1.02] sm:leading-[0.95]",
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "max-w-2xl leading-snug text-stadium-muted",
                  compact
                    ? "mt-1.5 hidden text-sm sm:block"
                    : "mt-2 text-[15px] line-clamp-2 sm:mt-3 sm:text-base sm:leading-normal sm:line-clamp-none",
                )}
              >
                {description}
              </p>
            )}
          </div>
          {actions && <div className="min-w-0 max-w-full reveal reveal-delay-1">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
