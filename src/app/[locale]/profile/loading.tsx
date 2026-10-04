import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left sidebar skeleton */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-stadium-surface border border-stadium-border p-5 mb-4">
              <div className="flex flex-col items-center">
                <Skeleton className="w-20 h-20 rounded-full mb-3" />
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-7 w-28 rounded-full mt-3" />
              </div>
            </div>
            <div className="bg-stadium-surface border border-stadium-border overflow-hidden">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-none" />
              ))}
            </div>
          </aside>

          {/* Right content skeleton */}
          <main className="flex-1">
            <div className="bg-stadium-surface border border-stadium-border p-5 sm:p-6">
              <Skeleton className="h-6 w-40 mb-5" />
              <div className="flex flex-col sm:flex-row gap-6">
                <Skeleton className="w-24 h-24 rounded-full shrink-0 self-center sm:self-start" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
