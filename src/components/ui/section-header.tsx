import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** "See all" style link on the right. */
  href?: string;
  linkLabel?: string;
  className?: string;
  /** Heading level to render; pages already have an h1, so sections default to h2. */
  as?: "h2" | "h3";
}

/** Consistent title row for a page section: eyebrow, title, optional "see all" link. */
export function SectionHeader({ title, eyebrow, href, linkLabel, className, as: Tag = "h2" }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4 sm:mb-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="section-label text-brand mb-1">{eyebrow}</p>}
        <Tag className="font-bebas text-3xl sm:text-4xl leading-[1.1] text-white text-balance">{title}</Tag>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="tap-target shrink-0 inline-flex items-center gap-1.5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-stadium-muted hover:text-white transition-colors"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
