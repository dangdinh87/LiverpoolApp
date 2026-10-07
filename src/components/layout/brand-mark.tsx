import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-wordmark";

/**
 * The square mark: a white globe (rim plus one meridian) on brand red, with a
 * gold dot for one supporter somewhere else. The same drawing as
 * `public/brand/icon.svg` (the favicon and app icon), inlined so it scales
 * crisply, inherits no external request, and needs no `next/image`.
 *
 * Decorative: name the surrounding link with `aria-label={BRAND.name}`.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="512" height="512" fill={BRAND.red} />
      <g fill="none" stroke="#ffffff" strokeWidth="40" strokeLinecap="round">
        <circle cx="256" cy="256" r="166" />
        <ellipse cx="256" cy="256" rx="80" ry="166" />
      </g>
      <circle cx="373" cy="139" r="54" fill={BRAND.red} />
      <circle cx="373" cy="139" r="34" fill="#f6eb61" />
    </svg>
  );
}

interface BrandLogoProps {
  /** Font-size class for the wordmark (e.g. `text-[26px]`); the mark scales with `markClassName`. */
  wordmarkClassName?: string;
  /** Size classes for the mark (e.g. `size-8`). */
  markClassName?: string;
  className?: string;
}

/** Mark + wordmark lockup: the logo as shown in the header, menu and footer. */
export function BrandLogo({ wordmarkClassName, markClassName = "size-8", className }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-hidden>
      <BrandMark className={markClassName} />
      <BrandWordmark className={wordmarkClassName} />
    </span>
  );
}
