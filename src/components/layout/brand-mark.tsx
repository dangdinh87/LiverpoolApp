import { BRAND, MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-wordmark";

/**
 * The mark: two pages folded into an "A" with a gold crossbar, on a red rounded
 * tile (MARK in src/lib/brand.ts). Same drawing as `public/brand/icon.svg`,
 * inlined so it scales crisply, makes no request and needs no `next/image`.
 *
 * Decorative: name the surrounding link with `aria-label={BRAND.name}`.
 */
export function BrandMark({ className }: { className?: string }) {
  const { size, radius, back, front, backFill, rule } = MARK;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false" className={cn("shrink-0", className)}>
      <rect width={size} height={size} rx={radius} fill={BRAND.red} />
      <polygon points={back} fill={backFill} />
      <polygon points={front} fill="#ffffff" />
      <rect x={rule.x} y={rule.y} width={rule.width} height={rule.height} fill={BRAND.gold} />
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
