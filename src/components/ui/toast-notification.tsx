"use client";

import { useEffect } from "react";
import { Check, X, Heart, Info, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";

const ICON_MAP = {
  success: <Check size={16} aria-hidden />,
  error: <AlertCircle size={16} aria-hidden />,
  favourite: <Heart size={16} className="fill-current" aria-hidden />,
  info: <Info size={16} aria-hidden />,
};

// Solid, AA-contrast fills (white text >= 4.5:1) with a hairline edge.
const STYLE_MAP = {
  success: "bg-green-700 border-green-500/40",
  error: "bg-red-700 border-red-400/40",
  favourite: "bg-lfc-red border-white/20",
  info: "bg-stadium-surface2 border-[var(--line-strong)]",
};

const DURATION = 3500;

/** Global toast renderer — mount once in root layout. Sits under the header, never over it. */
export function GlobalToast() {
  const t = useTranslations("Common");
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, DURATION);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      // Re-key so a new message replays the entrance animation.
      key={`${toast.type}:${toast.message}`}
      role={toast.type === "error" ? "alert" : "status"}
      className={cn(
        "reveal fixed left-1/2 z-[80] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 border pl-4 pr-1 text-white shadow-lg font-inter text-sm",
        STYLE_MAP[toast.type]
      )}
      style={{ top: "calc(var(--live-banner-h, 0px) + var(--header-h) + 0.75rem)" }}
    >
      {ICON_MAP[toast.type]}
      <span className="py-2.5">{toast.message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="inline-flex size-10 shrink-0 items-center justify-center hover:bg-white/10 cursor-pointer"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
