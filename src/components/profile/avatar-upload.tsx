"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import { uploadAvatar } from "@/app/actions/profile";

interface AvatarUploadProps {
  currentUrl: string | null;
  username: string | null;
}

export function AvatarUpload({ currentUrl, username }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2MB");
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    const formData = new FormData();
    formData.set("avatar", file);
    setError(null);
    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (result?.error) {
        setError(result.error);
        setPreview(currentUrl); // revert preview on failure
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-stadium-border hover:border-lfc-red/60 transition-colors"
        aria-label="Upload avatar"
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
        {/* Overlay on hover */}
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
      <p className="font-inter text-xs text-stadium-muted">Click to change avatar (max 2MB)</p>
    </div>
  );
}
