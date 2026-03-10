import { Skeleton } from "@/components/ui/skeleton";

export default function FixturesLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-40 mb-8" />
        <div className="flex gap-2 mb-8">
          {[3, 4, 5].map((i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
