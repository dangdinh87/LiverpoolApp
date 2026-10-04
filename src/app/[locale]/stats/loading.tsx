import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end bg-stadium-bg">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <Skeleton className="h-4 w-48 mb-3 bg-stadium-surface" />
          <Skeleton className="h-16 w-72 bg-stadium-surface" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 space-y-10">
        {/* Overview grid skeleton */}
        <div className="bg-stadium-surface border border-stadium-border p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="bg-stadium-surface2 rounded p-4 text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-2 bg-stadium-border" />
                <Skeleton className="h-3 w-16 mx-auto bg-stadium-border" />
              </div>
            ))}
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-stadium-surface border border-stadium-border p-6">
              <Skeleton className="h-6 w-32 mb-4 bg-stadium-border" />
              <Skeleton className="h-[250px] w-full bg-stadium-surface2" />
            </div>
          ))}
        </div>

        {/* Competition skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-stadium-surface border border-stadium-border p-4">
              <Skeleton className="h-4 w-24 mb-3 bg-stadium-border" />
              <Skeleton className="h-3 w-16 mb-2 bg-stadium-border" />
              <Skeleton className="h-1.5 w-full mb-2 bg-stadium-border" />
              <Skeleton className="h-3 w-20 bg-stadium-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
