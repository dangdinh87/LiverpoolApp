"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/supabase";

interface ProfileFormProps {
  profile: UserProfile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const { show: showToast } = useToast();
  const t = useTranslations("Profile");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) showToast({ type: "error", message: result.error });
      else showToast({ type: "success", message: t("success") });
    });
  }

  return (
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
  );
}
