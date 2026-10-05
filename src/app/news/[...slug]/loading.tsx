import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Same geometry as the article reader: back link, meta, headline, actions, hero, body. */
export default function ArticleLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="page-container pb-16 pt-[calc(var(--header-h)+1rem)]">
        <Skeleton className="h-11 w-40" />
        <div className="mt-2 max-w-4xl space-y-4">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-9 w-full sm:h-10" />
          <Skeleton className="h-9 w-4/5 sm:h-10" />
        </div>
        <div className="mt-6 grid max-w-xl grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
        <Skeleton className="-mx-4 mt-6 aspect-video max-h-[480px] sm:mx-0" />
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <div className="max-w-2xl space-y-6">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonText key={i} lines={4} className="space-y-3" />
            ))}
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
