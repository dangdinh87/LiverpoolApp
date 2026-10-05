import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Mirrors the history page: compact hero, section nav, first timeline cards. */
export default function HistoryLoading() {
  return (
    <div role="status" aria-busy="true" className="bg-stadium-bg">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pt-[calc(var(--header-h)+1.5rem)] pb-6 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-12 w-3/4 sm:h-16 sm:w-1/2" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <div className="mt-5 grid grid-cols-4 gap-4 sm:max-w-xl">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
      <div className="border-b border-[var(--line)]">
        <div className="page-container flex h-12 items-center gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>
      <div className="page-container py-10 sm:py-14">
        <Skeleton className="mb-6 h-9 w-48" />
        <div className="space-y-6 border-l border-[var(--line-strong)] pl-8 md:mx-auto md:max-w-2xl">
          <SkeletonCard aspect="aspect-[16/9]" />
          <SkeletonCard aspect="aspect-[16/9]" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
