import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title row for a side widget (smaller than SectionHeader): h2 + optional "see all". */
export function WidgetHeader({
  title,
  href,
  linkLabel,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="font-bebas text-2xl leading-none text-white">{title}</h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="tap-target inline-flex shrink-0 items-center gap-1 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
