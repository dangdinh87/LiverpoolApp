import { Skeleton } from "@/components/ui/skeleton";

export default function SquadLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        {/* Filter tabs */}
        <div className="flex gap-2 mb-8">
          {[80, 60, 70, 65, 75].map((w, i) => (
            <Skeleton key={i} className={`h-9 w-${w === 80 ? '20' : w === 60 ? '14' : '16'} rounded-full`} />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-none overflow-hidden bg-stadium-surface border border-stadium-border">
              <Skeleton className="h-52 w-full rounded-none" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
