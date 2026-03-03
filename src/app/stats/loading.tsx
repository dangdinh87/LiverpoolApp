import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-40 mb-12" />
        {/* Headline stats */}
        <div className="grid grid-cols-3 gap-4 mb-16 bg-stadium-surface border border-stadium-border rounded-2xl p-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-20 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-stadium-surface border border-stadium-border rounded-2xl p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-3 w-48 mb-6" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
