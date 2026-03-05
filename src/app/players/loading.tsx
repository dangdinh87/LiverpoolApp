import { Skeleton } from "@/components/ui/skeleton";

export default function PlayersLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />

        {/* Filter bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-14" />
          ))}
          <Skeleton className="h-8 w-36 ml-2" />
          <Skeleton className="h-8 w-48 ml-auto" />
        </div>

        {/* Table rows */}
        <div className="border border-stadium-border">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 border-t border-stadium-border">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-8 ml-auto" />
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
