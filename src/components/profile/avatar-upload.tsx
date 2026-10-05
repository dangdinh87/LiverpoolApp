"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import { updateAvatarUrl } from "@/app/actions/profile";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface AvatarUploadProps {
  currentUrl: string | null;
  username: string | null;
}

export function AvatarUpload({ currentUrl, username }: AvatarUploadProps) {
  const t = useTranslations("Profile.avatar");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t("errorSize"));
      return;
    }

    // Local preview immediately, upload in the background.
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError(t("errorAuth")); setPreview(currentUrl); return; }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (uploadErr) { setError(t("errorUpload")); setPreview(currentUrl); return; }

        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

        // Update profile row via server action (tiny payload, no file)
        const result = await updateAvatarUrl(publicUrl);
        if (result?.error) { setError(t("errorUpload")); setPreview(currentUrl); }
      } catch {
        setError(t("errorUpload"));
        setPreview(currentUrl);
      }
    });
  }

  return (
    <div className="flex w-40 flex-col items-center gap-3 text-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="group relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-[var(--line-strong)] transition-colors hover:border-lfc-red"
        aria-label={t("upload")}
      >
        {preview ? (
          <Image src={preview} alt={username ?? ""} fill sizes="96px" className="object-cover" unoptimized />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--surface-3)]">
            <User className="size-10 text-stadium-muted" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-6 text-white" aria-hidden />
        </div>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} tabIndex={-1} aria-hidden />

      <p className="text-xs text-stadium-muted" aria-live="polite">
        {isPending ? t("uploading") : t("clickToChange")}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
