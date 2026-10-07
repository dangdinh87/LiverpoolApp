import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero (season chips) + the match-centre tab bar + match cards. */
export default function SeasonLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-4 pt-[calc(var(--header-h)+0.75rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="mb-2 h-3.5 w-28" />
              <Skeleton className="h-9 w-64 sm:h-16" />
              <Skeleton className="mt-3 h-4 w-72 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-11 w-28" />
              <Skeleton className="h-11 w-28" />
              <Skeleton className="h-11 w-28" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-container pb-16">
        <div className="-mx-4 flex h-[45px] items-center gap-2 border-b border-[var(--line)] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
          <Skeleton className="h-6 flex-1 sm:w-24 sm:flex-none" />
        </div>
        <div className="flex gap-2 overflow-hidden pt-3">
          <Skeleton className="h-11 w-32 shrink-0" />
          <Skeleton className="h-11 w-36 shrink-0" />
          <Skeleton className="h-11 w-40 shrink-0" />
        </div>
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-4 h-5 w-32" />
        <ul className="mt-3 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}><Skeleton className="h-[8.75rem] w-full sm:h-[9.5rem]" /></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
