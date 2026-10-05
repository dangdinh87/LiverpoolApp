"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { useToast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/supabase";

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const BIO_MAX = 200;

interface ProfileFormProps {
  profile: UserProfile | null;
}

const FIELD =
  "w-full border bg-[var(--surface-1)] px-3 py-2.5 text-[15px] text-white placeholder:text-stadium-muted focus-visible:outline-none";

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const { show: showToast } = useToast();
  const t = useTranslations("Profile");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [touched, setTouched] = useState(false);

  const trimmed = username.trim();
  // Empty is allowed (falls back to "Red Member"); otherwise 3–30 characters.
  const usernameError = trimmed.length > 0 && trimmed.length < USERNAME_MIN ? t("usernameTooShort", { min: USERNAME_MIN }) : null;
  const showError = touched && usernameError;

  function handleSubmit(formData: FormData) {
    setTouched(true);
    if (usernameError) return;
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) showToast({ type: "error", message: result.error });
      else showToast({ type: "success", message: t("success") });
    });
  }

  return (
    <form action={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="profile-username" className="mb-1.5 block font-barlow text-xs font-bold uppercase tracking-[0.14em] text-stadium-muted">
          {t("username")}
        </label>
        <input
          id="profile-username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={USERNAME_MAX}
          autoComplete="nickname"
          aria-invalid={showError ? true : undefined}
          aria-describedby="profile-username-help"
          className={cn(FIELD, showError ? "border-red-400" : "border-[var(--line-strong)] focus-visible:border-lfc-red")}
          placeholder={t("username_placeholder")}
        />
        <p id="profile-username-help" className={cn("mt-1.5 text-xs", showError ? "text-red-300" : "text-stadium-muted")}>
          {showError ? usernameError : `${trimmed.length}/${USERNAME_MAX}`}
        </p>
      </div>

      <div>
        <label htmlFor="profile-bio" className="mb-1.5 block font-barlow text-xs font-bold uppercase tracking-[0.14em] text-stadium-muted">
          {t("bio")}
        </label>
        <textarea
          id="profile-bio"
          name="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          aria-describedby="profile-bio-help"
          className={cn(FIELD, "resize-none border-[var(--line-strong)] focus-visible:border-lfc-red")}
          placeholder={t("bio_placeholder")}
        />
        <p id="profile-bio-help" className="mt-1.5 text-xs text-stadium-muted">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 self-start bg-lfc-red px-6 font-barlow font-bold uppercase tracking-[0.12em] text-white hover:bg-lfc-red-dark"
      >
        {isPending ? t("saving") : t("update")}
      </Button>
    </form>
  );
}
