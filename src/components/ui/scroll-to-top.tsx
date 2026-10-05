"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Floating "back to top". Sits above the chat button (GlobalChat publishes
 * --fab-offset) and clear of the iOS home indicator. Always mounted so the
 * fade is a pure CSS transition; hidden from tab order/AT while invisible.
 */
export function ScrollToTop() {
  const t = useTranslations("Common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("scrollToTop")}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed z-50 flex size-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-stadium-surface/95 text-white shadow-lg backdrop-blur",
        "transition-[opacity,transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-lfc-red",
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
      )}
      style={{
        right: "max(1.625rem, env(safe-area-inset-right))",
        bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + var(--fab-offset, 0px))",
      }}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
