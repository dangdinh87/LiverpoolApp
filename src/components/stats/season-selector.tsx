"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const SEASONS = [2025, 2024, 2023];
const CURRENT_SEASON = 2025;

export function SeasonSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selected = searchParams.get("season") ? parseInt(searchParams.get("season")!, 10) : CURRENT_SEASON;

  function handleChange(season: number) {
    if (season === selected) return;
    const url = season === CURRENT_SEASON ? "/stats" : `/stats?season=${season}`;
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {SEASONS.map((s) => {
          const isActive = s === selected;
          const isCurrent = s === CURRENT_SEASON;
          const label = `${s}/${(s + 1).toString().slice(-2)}`;

          return (
            <button
              key={s}
              onClick={() => handleChange(s)}
              disabled={isPending}
              className={cn(
                "px-3 py-1 font-barlow text-[11px] uppercase tracking-wider transition-all relative",
                isActive
                  ? "bg-lfc-red text-white"
                  : "text-stadium-muted hover:text-white",
                isPending && "cursor-wait"
              )}
            >
              {label}
              {isCurrent && !isActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-lfc-red" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content skeleton overlay — renders below hero when pending */}
      {isPending && <SeasonLoadingSkeleton />}
    </>
  );
}

// Skeleton shown over content area while data loads
function SeasonLoadingSkeleton() {
  return (
    <div className="fixed inset-0 top-[40vh] z-40 bg-stadium-bg/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-6 animate-pulse">
        {/* Overview grid skeleton */}
        <div className="bg-stadium-surface border border-stadium-border p-6">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-stadium-surface2 rounded p-4 text-center">
                <div className="h-8 w-12 mx-auto mb-2 bg-stadium-border rounded" />
                <div className="h-3 w-16 mx-auto bg-stadium-border rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-stadium-surface border border-stadium-border p-6">
              <div className="h-5 w-32 mb-4 bg-stadium-border rounded" />
              <div className="h-[200px] w-full bg-stadium-surface2 rounded" />
            </div>
          ))}
        </div>

        {/* Competition skeleton */}
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-stadium-surface border border-stadium-border p-4">
              <div className="h-4 w-24 mb-3 bg-stadium-border rounded" />
              <div className="h-3 w-16 mb-2 bg-stadium-border rounded" />
              <div className="h-1.5 w-full mb-2 bg-stadium-border rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
