import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + the 20-row table card (44px rows). */
export default function StandingsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1.5rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-3 h-3.5 w-40" />
          <Skeleton className="h-12 w-56 sm:h-16" />
          <Skeleton className="mt-4 h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="page-container pb-16 pt-4 sm:pt-6">
        <div className="surface overflow-hidden">
          <div className="h-[2.6rem] border-b border-[var(--line)] bg-[var(--surface-1)]" />
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-3 border-b border-[var(--line)] px-3 last:border-0">
              <Skeleton className="h-4 w-5" />
              <Skeleton className="size-6 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-7" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
          <div className="h-[2.75rem] border-t border-[var(--line)]" />
        </div>
      </div>
    </div>
  );
}
