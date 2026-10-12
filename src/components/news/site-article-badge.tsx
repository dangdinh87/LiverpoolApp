import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

interface SiteArticleBadgeProps {
  label: string;
  compact?: boolean;
}

/**
 * Byline for pieces the site writes itself: the site's own mark beside
 * "By Reds Abroad". It reads as a signature rather than a sticker, so it can sit
 * on a photo or a card without competing with the headline.
 */
export function SiteArticleBadge({ label, compact = false }: SiteArticleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold text-white",
        compact ? "gap-1.5 text-xs" : "gap-2 text-sm",
      )}
    >
      <BrandMark className={compact ? "size-4" : "size-5"} />
      {label}
    </span>
  );
}
