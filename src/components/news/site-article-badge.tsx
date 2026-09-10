import { PenLine } from "lucide-react";

interface SiteArticleBadgeProps {
  label: string;
  compact?: boolean;
}

export function SiteArticleBadge({ label, compact = false }: SiteArticleBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 border border-lfc-red/70 bg-lfc-red text-white",
        "font-barlow font-bold uppercase tracking-[0.16em]",
        "shadow-[0_0_24px_rgba(200,16,46,0.35)] ring-1 ring-white/10",
        "before:block before:h-4 before:w-0.5 before:bg-lfc-gold before:content-['']",
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
      ].join(" ")}
    >
      <PenLine className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}
