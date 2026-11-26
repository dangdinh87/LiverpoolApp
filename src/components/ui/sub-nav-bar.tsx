"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface SubNavItem {
  slug: string;
  href: string;
  label: string;
  badge?: string | number;
}

export interface SubNavBarProps {
  ariaLabel: string;
  items: readonly SubNavItem[];
  current: string;
  className?: string;
}

/**
 * Shared sticky sub-navigation bar with prefetched links and optimistic
 * zero-latency active indicator updates on click.
 */
export function SubNavBar({ ariaLabel, items, current, className }: SubNavBarProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [prevCurrent, setPrevCurrent] = useState(current);
  if (prevCurrent !== current) {
    setPrevCurrent(current);
    setPending(null);
  }
  const activeSlug = pending ?? current;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "section-subnav sticky top-[var(--header-h)] z-30 w-full border-b border-[var(--line)] bg-stadium-bg/95 backdrop-blur-md",
        className,
      )}
    >
      <div className="page-container">
        <div className="scroll-x scroll-x-fade flex items-center gap-1 sm:gap-2">
          {items.map((item) => {
            const isActive = item.slug === activeSlug;
            const hasBadge = item.badge !== undefined && item.badge !== "";

            return (
              <Link
                key={item.slug}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setPending(item.slug)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 sm:px-4 font-barlow text-sm font-semibold uppercase tracking-[0.08em] transition-colors",
                  isActive
                    ? "border-lfc-red text-white"
                    : "border-transparent text-stadium-muted hover:border-white/20 hover:text-white",
                )}
              >
                <span>{item.label}</span>
                {hasBadge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-barlow text-[11px] font-semibold tabular-nums",
                      isActive ? "bg-lfc-red/20 text-lfc-red" : "bg-white/[0.06] text-stadium-muted",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
