import { Skeleton } from "@/components/ui/skeleton";

export default function StandingsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-48 mb-8" />
        <div className="bg-stadium-surface border border-stadium-border rounded-none overflow-hidden">
          <div className="flex gap-4 px-6 py-3 border-b border-stadium-border">
            <Skeleton className="h-3 flex-1" />
            {[20, 16, 16, 16, 16, 16, 16, 24].map((w, i) => (
              <div key={i} className="flex-none" style={{ width: `${w}px` }}>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-stadium-border/40">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
              {[4, 3, 3, 4, 4, 4, 4].map((w, j) => (
                <Skeleton key={j} className={`h-4 w-${w * 2}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
