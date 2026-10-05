/** Same footprint as the login card so the page does not jump when the form mounts. */
export function AuthCardSkeleton() {
  return <div aria-hidden className="surface w-full max-w-sm h-[34rem] animate-pulse" />;
}
