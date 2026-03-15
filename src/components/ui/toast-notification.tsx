"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Heart, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";

const ICON_MAP = {
  success: <Check size={16} />,
  error: <X size={16} />,
  favourite: <Heart size={16} className="fill-current" />,
  info: <Info size={16} />,
};

const STYLE_MAP = {
  success: "bg-green-600/90 text-white border border-green-500/30",
  error: "bg-red-600/90 text-white border border-red-500/30",
  favourite: "bg-lfc-red/90 text-white border border-lfc-red/30",
  info: "bg-stadium-surface2/95 text-white border border-white/20",
};

const DURATION = 2500;

/** Global toast renderer — mount once in root layout */
export function GlobalToast() {
  const toast = useToastStore((s) => s.toast);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, DURATION);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 shadow-lg font-inter text-sm backdrop-blur-md",
            STYLE_MAP[toast.type]
          )}
        >
          {ICON_MAP[toast.type]}
          <span>{toast.message}</span>
          <button onClick={dismiss} className="ml-1 hover:opacity-70 cursor-pointer">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
