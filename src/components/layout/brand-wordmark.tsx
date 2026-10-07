import { WORDMARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The LFCVN wordmark as inline SVG. Letters take the current text colour (white
 * on the dark chrome); the short bar is always brand red. Size it with a height
 * class, e.g. `h-6`: the width follows the viewBox. Decorative: put the brand
 * name on the surrounding link (`aria-label`).
 */
export function BrandWordmark({ className }: { className?: string }) {
  const { bar } = WORDMARK;
  return (
    <svg
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      className={cn("block w-auto", className)}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d={WORDMARK.letters} />
      <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} className="fill-lfc-red" />
    </svg>
  );
}
