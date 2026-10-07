import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero + the match-centre tab bar + the 20-row table card (44px rows). */
export default function StandingsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-4 pt-[calc(var(--header-h)+0.75rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-2 h-3.5 w-40" />
          <Skeleton className="h-9 w-56 sm:h-16" />
          <Skeleton className="mt-3 h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="page-container pb-16">
        <div className="-mx-4 flex h-[45px] items-center gap-2 border-b border-[var(--line)] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
        </div>
        <div className="surface mt-4 overflow-hidden sm:mt-6">
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
