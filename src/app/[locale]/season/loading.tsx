import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PageHero (with season chips) + tab chips + match cards. */
export default function SeasonLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1.5rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="mb-3 h-3.5 w-28" />
              <Skeleton className="h-12 w-64 sm:h-16" />
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
      <div className="page-container pb-16">
        <div className="-mx-4 flex gap-2 border-b border-[var(--line)] px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="pt-4">
          <div className="space-y-2 border-b border-[var(--line)] py-2.5">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
            <div className="flex gap-2 overflow-hidden">
              <Skeleton className="h-10 w-24 shrink-0" />
              <Skeleton className="h-10 w-36 shrink-0" />
              <Skeleton className="h-10 w-40 shrink-0" />
              <Skeleton className="h-10 w-32 shrink-0" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-64" />
          <Skeleton className="mt-4 h-5 w-32" />
          <ul className="mt-3 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}><Skeleton className="h-[8.75rem] w-full sm:h-[9.5rem]" /></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
