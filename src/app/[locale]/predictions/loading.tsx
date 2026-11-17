import { Skeleton } from "@/components/ui/skeleton";

/** Content-shaped skeleton matching /predictions: PageHero + next-match CTA + leaderboard table. */
export default function PredictionsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-5 pt-[calc(var(--header-h)+1rem)] sm:pb-7 sm:pt-[calc(var(--header-h)+1.75rem)]">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-2 h-10 w-60 sm:h-12 sm:w-80" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="page-container pb-16 pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="surface mb-8 flex items-center justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3.5 w-36" />
            </div>
            <Skeleton className="h-11 w-32 shrink-0" />
          </div>

          <Skeleton className="mb-3 h-8 w-44" />
          <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-4 flex-1 max-w-48" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
