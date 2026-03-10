"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/supabase";

interface ProfileFormProps {
  profile: UserProfile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("Profile");

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleSubmit(formData: FormData) {
    setToast(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) setToast({ type: "error", message: result.error });
      else setToast({ type: "success", message: t("success") });
    });
  }

  return (
    <>
      {/* Toast notification — fixed top-center */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg font-inter text-sm",
              toast.type === "success"
                ? "bg-green-500/90 text-white"
                : "bg-red-500/90 text-white"
            )}
          >
            {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 cursor-pointer">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
            {t("username")}
          </label>
          <input
            name="username"
            type="text"
            defaultValue={profile?.username ?? ""}
            maxLength={30}
            className={cn(
              "w-full bg-stadium-bg border border-stadium-border rounded-none px-3 py-2.5 text-white font-inter text-sm",
              "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
            )}
            placeholder={t("username_placeholder")}
          />
        </div>
        <div>
          <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
            {t("bio")}
          </label>
          <textarea
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            maxLength={200}
            className={cn(
              "w-full bg-stadium-bg border border-stadium-border rounded-none px-3 py-2.5 text-white font-inter text-sm resize-none",
              "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
            )}
            placeholder={t("bio_placeholder")}
          />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] self-start cursor-pointer"
        >
          {isPending ? t("saving") : t("update")}
        </Button>
      </form>
    </>
  );
}
