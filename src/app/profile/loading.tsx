import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-32 mb-10" />
        <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="w-24 h-24 rounded-full flex-shrink-0 self-center md:self-start" />
            <div className="flex-1 flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
        <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-6 md:p-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
