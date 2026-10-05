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
export function PageHero({ title, eyebrow, description, image, actions, className }: PageHeroProps) {
  return (
    <header className={cn("relative isolate overflow-hidden border-b border-[var(--line)]", className)}>
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover -z-20" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-stadium-bg/70 via-stadium-bg/80 to-stadium-bg" />
        </>
      )}
      <div className="page-container pt-[calc(var(--header-h)+0.75rem)] pb-4 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 reveal">
            {eyebrow && <p className="section-label text-brand mb-1 sm:mb-2">{eyebrow}</p>}
            <h1 className="font-bebas text-4xl sm:text-6xl lg:text-7xl leading-[1.02] sm:leading-[0.95] text-white text-balance">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-[15px] leading-snug text-stadium-muted line-clamp-2 sm:mt-3 sm:text-base sm:leading-normal sm:line-clamp-none">{description}</p>}
          </div>
          {actions && <div className="min-w-0 max-w-full reveal reveal-delay-1">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
