import { BRAND, MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-wordmark";

/**
 * The mark: a pitch's centre circle seen from above, white on a red rounded
 * tile (MARK in src/lib/brand.ts). Same drawing as `public/brand/icon.svg`,
 * inlined so it scales crisply, makes no request and needs no `next/image`.
 *
 * `size` sets pixel width/height for the share images (Satori ignores classes);
 * the site sizes it with `className`.
 *
 * Decorative: name the surrounding link with `aria-label={BRAND.name}`.
 */
export function BrandMark({ className, size: px }: { className?: string; size?: number }) {
  const { size, radius, line, circle, spot } = MARK;
  const c = size / 2;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={px}
      height={px}
      aria-hidden
      focusable="false"
      className={className === undefined && px !== undefined ? undefined : cn("shrink-0", className)}
    >
      <rect width={size} height={size} rx={radius} fill={BRAND.red} />
      <rect x={line.x} y={0} width={line.width} height={size} fill="#ffffff" />
      <circle cx={c} cy={c} r={circle.r} fill="none" stroke="#ffffff" strokeWidth={circle.stroke} />
      <circle cx={c} cy={c} r={spot.r} fill="#ffffff" />
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
