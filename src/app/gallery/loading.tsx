import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the gallery page: hero, search + chips, 4:3 photo tiles. */
export default function GalleryLoading() {
  return (
    <div role="status" aria-busy="true" className="bg-stadium-bg">
      <div className="border-b border-[var(--line)]">
        <div className="page-container pt-[calc(var(--header-h)+1.5rem)] pb-6 sm:pb-10 sm:pt-[calc(var(--header-h)+3rem)]">
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-12 w-1/2 sm:h-16 sm:w-1/3" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="page-container py-6 pb-16">
        <Skeleton className="mb-3 h-11 w-full sm:max-w-sm" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
