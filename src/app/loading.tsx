import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative h-[80vh] min-h-[500px] bg-stadium-surface/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-64 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
        </div>
      </div>

      {/* Bento grid skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      {/* News skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-8 w-40 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <Skeleton className="lg:col-span-3 aspect-16/10 w-full" />
          <div className="lg:col-span-2 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3">
                <Skeleton className="w-24 h-20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
