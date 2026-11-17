import { Skeleton } from "@/components/ui/skeleton";

/** Content-shaped skeleton matching /analysis: PageHero + lead feature + 2-column article list. */
export default function AnalysisLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-5 pt-[calc(var(--header-h)+1rem)] sm:pb-7 sm:pt-[calc(var(--header-h)+1.75rem)]">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-2 h-10 w-56 sm:h-12 sm:w-72" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </div>
      </div>

      <div className="page-container pb-16 pt-6 sm:pt-8">
        <div className="mb-8 grid gap-5 border-b border-[var(--line)] pb-8 sm:mb-10 sm:pb-10 lg:grid-cols-12 lg:gap-8">
          <Skeleton className="aspect-[16/10] w-full lg:col-span-7" />
          <div className="flex flex-col justify-center space-y-3 lg:col-span-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-start gap-4 border-b border-[var(--line)] py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="aspect-[4/3] w-24 shrink-0 sm:w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
