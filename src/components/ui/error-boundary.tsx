"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface ErrorBoundaryProps {
  message?: string;
  reset: () => void;
  /** Next.js error digest: shown small so a user can quote it when reporting. */
  digest?: string;
}

/** Calm, recoverable error panel: retry in place, or leave to the home page. */
export function ErrorBoundary({ message, reset, digest }: ErrorBoundaryProps) {
  const t = useTranslations("Common");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 pt-[calc(var(--header-h)+1rem)] pb-16">
      <div role="alert" className="surface max-w-md w-full px-6 py-8 text-center">
        <p className="font-bebas text-5xl text-white leading-none mb-3">{t("errorTitle")}</p>
        <p className="font-inter text-stadium-muted text-[15px] mb-6">{message ?? t("errorMessage")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 px-6 bg-lfc-red text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:bg-lfc-red-dark transition-colors cursor-pointer"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="min-h-11 px-6 inline-flex items-center justify-center border border-[var(--line-strong)] text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:bg-white/5 transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
        {digest && <p className="mt-5 font-inter text-xs text-stadium-muted">{t("errorRef", { digest })}</p>}
      </div>
    </div>
  );
}
