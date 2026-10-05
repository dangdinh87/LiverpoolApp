import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero (season chips) + overview tiles + two chart cards. */
export default function StatsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1.5rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="mb-3 h-3.5 w-28" />
              <Skeleton className="h-12 w-56 sm:h-16" />
              <Skeleton className="mt-4 h-4 w-72 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-container space-y-10 pb-16 pt-6 sm:space-y-14 sm:pt-10">
        <section>
          <Skeleton className="mb-4 h-10 w-52 sm:mb-6" />
          <div className="surface space-y-3 p-4 sm:p-6">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[4.5rem] sm:h-[5.75rem]" />)}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[4.5rem] sm:h-[5.75rem]" />)}
            </div>
          </div>
        </section>
        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="surface p-4 sm:p-6">
              <Skeleton className="mb-4 h-7 w-40" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
