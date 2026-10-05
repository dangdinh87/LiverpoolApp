import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/** Same geometry as a digest page: back link, badge row, headline, lead, sections. */
export default function DigestLoading() {
  return (
    <div className="min-h-screen" aria-busy="true">
      <div className="page-container max-w-3xl pb-16 pt-[calc(var(--header-h)+1rem)]">
        <Skeleton className="h-11 w-40" />
        <div className="mt-2 space-y-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-full sm:h-11" />
          <Skeleton className="h-9 w-3/4 sm:h-11" />
        </div>
        <div className="mt-8 space-y-8">
          <SkeletonText lines={3} />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-7 w-2/3" />
              <SkeletonText lines={5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
