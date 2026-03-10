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
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only image files (JPEG, PNG, WebP, GIF) are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Image must be under 2MB");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload directly to Supabase Storage from client
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setPreview(currentUrl); return; }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true });

        if (uploadErr) { setError("Upload failed. Please try again."); setPreview(currentUrl); return; }

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        // Update profile row via server action (tiny payload, no file)
        const result = await updateAvatarUrl(publicUrl);
        if (result?.error) { setError(result.error); setPreview(currentUrl); }
      } catch {
        setError("Upload failed. Please try again.");
        setPreview(currentUrl);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-stadium-border hover:border-lfc-red/60 transition-colors cursor-pointer"
        aria-label={t("upload")}
      >
        {preview ? (
          <Image
            src={preview}
            alt={username ?? "Avatar"}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-stadium-surface2 flex items-center justify-center">
            <User className="w-10 h-10 text-stadium-muted" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
        {isPending && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <p className="text-red-400 font-inter text-xs">{error}</p>
      )}
      <p className="font-inter text-xs text-stadium-muted">{t("clickToChange")}</p>
    </div>
  );
}
