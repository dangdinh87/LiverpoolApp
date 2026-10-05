import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/**
 * Home skeleton: same geometry as the hero + results + news + table layout.
 *
 * Every other route has its own loading.tsx, so this one only ever fires for
 * `/[locale]`. No `getTranslations` here on purpose: Next doesn't reliably
 * pass `params` to `loading.tsx` (it crashed destructuring `locale` from it),
 * and without a static locale, `getTranslations` falls back to reading the
 * real request, which pulled every page under `[locale]` into dynamic
 * rendering. The sr-only text below is a one-off, so it's just hardcoded.
 */
export default function HomeLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải…</span>
      <div className="border-b border-[var(--line)]">
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+2.5rem)]">
          <div className="grid gap-5 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-7">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-3 h-[2.9rem] w-72 sm:h-16 sm:w-[28rem]" />
              <Skeleton className="mt-2 h-[2.9rem] w-56 sm:h-16 sm:w-72" />
            </div>
            <div className="lg:col-span-5">
              <Skeleton className="h-[21.5rem] w-full sm:h-[23rem]" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-container py-6 sm:py-10 lg:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-6">
          <Skeleton className="h-[9.5rem] w-full lg:col-span-4 lg:col-start-9 lg:row-start-1" />
          <div className="space-y-3 lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Skeleton className="h-9 w-48" />
            <SkeletonCard aspect="aspect-[4/3] sm:aspect-[16/10]" className="border-0 [&>div:last-child]:hidden" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[5.5rem] w-full" />
            ))}
          </div>
          <Skeleton className="h-[22rem] w-full lg:col-span-4 lg:col-start-9 lg:row-start-2" />
        </div>
      </div>
    </div>
  );
}
