import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero Banner Skeleton */}
      <div className="h-[36vh] min-h-[280px] bg-stadium-surface" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 space-y-8">
        {/* Hero card skeleton */}
        <Skeleton className="w-full aspect-[21/9] rounded-sm" />

        {/* Secondary grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-0">
              <Skeleton className="w-full aspect-video rounded-t-sm" />
              <div className="p-4 space-y-2 bg-stadium-surface border border-stadium-border border-t-0 rounded-b-sm">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Compact list skeleton */}
        <div className="space-y-0">
          <Skeleton className="h-3 w-20 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 border-b border-stadium-border/50"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
