import { BRAND, WORDMARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The site wordmark: BRAND.name set in League Gothic with the short red rule
 * beneath its first letters.
 *
 * Live text rather than SVG outlines. The outlines spelled one specific name,
 * so a rename meant redrawing glyphs instead of editing the brand constant —
 * and text scales, copies and reads to assistive tech for free.
 *
 * Size it with a font-size class (e.g. `text-2xl`); the rule follows the text.
 * Decorative: put the brand name on the surrounding link (`aria-label`).
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex flex-col items-start leading-none", className)}
      aria-hidden
    >
      <span
        className="font-bebas uppercase leading-[0.82] whitespace-nowrap"
        style={{ letterSpacing: WORDMARK.letterSpacing }}
      >
        {BRAND.name}
      </span>
      <span
        className="block bg-lfc-red"
        style={{
          width: `${WORDMARK.bar.widthRatio * 100}%`,
          height: `${WORDMARK.bar.thicknessEm}em`,
          marginTop: `${WORDMARK.bar.gapEm}em`,
        }}
      />
    </span>
  );
}
