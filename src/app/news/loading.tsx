import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-12 w-40 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Featured */}
          <Skeleton className="md:col-span-2 h-52 rounded-2xl" />
          {/* Cards */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
