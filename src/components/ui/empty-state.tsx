import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** One clear next step. */
  actionHref?: string;
  actionLabel?: string;
  /** `error` = something failed (calm tone, no raw error text); `empty` = nothing to show. */
  tone?: "empty" | "error";
  className?: string;
}

/** Shared empty / outage state: never a blank gap, never raw error text. */
export function EmptyState({ title, description, icon, actionHref, actionLabel, tone = "empty", className }: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn("surface flex flex-col items-center text-center px-6 py-12 sm:py-16", className)}
    >
      {icon && <div className={cn("mb-4", tone === "error" ? "text-lfc-gold" : "text-stadium-muted")}>{icon}</div>}
      <p className="font-bebas text-2xl sm:text-3xl text-white">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-stadium-muted">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex min-h-11 items-center justify-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white hover:bg-lfc-red-dark transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
