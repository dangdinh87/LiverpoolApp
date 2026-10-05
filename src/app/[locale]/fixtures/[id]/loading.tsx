import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the score header + four stacked sections. */
export default function FixtureDetailLoading() {
  return (
    <div className="min-h-screen pb-16 pt-[calc(var(--header-h)+1rem)] sm:pt-[calc(var(--header-h)+1.5rem)]" aria-busy="true">
      <div className="page-container max-w-3xl">
        <Skeleton className="mb-4 h-10 w-40" />
        <div className="surface p-4 sm:p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:gap-4">
            <div className="flex flex-col items-center gap-2 sm:items-end">
              <Skeleton className="size-12 sm:size-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-center pt-1 sm:pt-3">
              <Skeleton className="h-12 w-20 sm:h-14 sm:w-28" />
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <Skeleton className="size-12 sm:size-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-3/4" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-10">
            <Skeleton className="mb-4 h-9 w-48 sm:mb-6 sm:h-10" />
            <Skeleton className="h-56 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
