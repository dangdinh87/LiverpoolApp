import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="h-[30vh] min-h-[240px] bg-stadium-surface" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-14" />
            ))}
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-48 sm:ml-auto" />
        </div>

        <Skeleton className="h-3 w-24 mb-4" />

        {/* Table skeleton */}
        <div className="border border-stadium-border">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 border-t border-stadium-border">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-8 ml-auto" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
