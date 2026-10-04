import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-32 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-stadium-surface border border-stadium-border rounded-none overflow-hidden">
              <Skeleton className="h-72 w-full rounded-none" />
              <div className="p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-3/4" />
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-8 w-56 mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-none" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
