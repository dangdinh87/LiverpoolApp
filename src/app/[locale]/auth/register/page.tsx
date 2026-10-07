import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { LoginForm } from "@/components/auth/login-form";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.metadata" });
  return { title: t("registerTitle"), description: t("registerDescription", { brand: BRAND.name }), robots: { index: false, follow: false } };
}

export default function RegisterPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 pb-16 pt-[calc(var(--header-h)+1.5rem)]">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm defaultMode="register" />
      </Suspense>
    </div>
  );
}
