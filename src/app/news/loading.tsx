import { Skeleton } from "@/components/ui/skeleton";
import { NewsCardSkeleton } from "@/components/news/news-card";

/** Same geometry as the news page: hero, filter bar, lead story, card grid. */
export default function NewsLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pt-[calc(var(--header-h)+1.5rem)] pb-6 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-12 w-56 sm:h-16" />
          <Skeleton className="mt-3 h-5 w-full max-w-md" />
        </div>
      </div>

      <div className="border-b border-[var(--line)]">
        <div className="page-container flex gap-2 py-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0" />
          ))}
        </div>
      </div>

      <div className="page-container space-y-4 pb-12 pt-4 sm:space-y-5 sm:pt-6">
        <div className="h-6" />
        <div aria-hidden className="surface grid overflow-hidden lg:grid-cols-5">
          <Skeleton className="aspect-[16/10] lg:col-span-3 lg:aspect-auto lg:min-h-[340px]" />
          <div className="space-y-3 p-4 sm:p-6 lg:col-span-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-4/5" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
