import { cn } from "@/lib/utils";

/** Shimmer placeholder. Give it the same size as the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-none skeleton", className)} />;
}

/** Stack of text-line placeholders; the last line is shorter, like real copy. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Card placeholder with an image area (fixed aspect) and text lines. */
export function SkeletonCard({ className, aspect = "aspect-video" }: { className?: string; aspect?: string }) {
  return (
    <div aria-hidden className={cn("surface overflow-hidden", className)}>
      <Skeleton className={cn("w-full", aspect)} />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </div>
  );
}
