import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Liverpool FC fan account.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 pb-16 pt-[calc(var(--header-h)+1.5rem)]">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
