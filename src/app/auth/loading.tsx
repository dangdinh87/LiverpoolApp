import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";

export default function AuthLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 pb-16 pt-[calc(var(--header-h)+1.5rem)]">
      <AuthCardSkeleton />
    </div>
  );
}
