"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/supabase";

interface ProfileFormProps {
  profile: UserProfile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) setError(result.error);
      else setSuccess(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
          Username
        </label>
        <input
          name="username"
          type="text"
          defaultValue={profile?.username ?? ""}
          maxLength={30}
          className={cn(
            "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 text-white font-inter text-sm",
            "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
          )}
          placeholder="Your display name"
        />
      </div>
      <div>
        <label className="font-inter text-xs text-stadium-muted uppercase tracking-wider block mb-1.5">
          Bio
        </label>
        <textarea
          name="bio"
          rows={3}
          defaultValue={profile?.bio ?? ""}
          maxLength={200}
          className={cn(
            "w-full bg-stadium-bg border border-stadium-border rounded-lg px-3 py-2.5 text-white font-inter text-sm resize-none",
            "focus:outline-none focus:border-lfc-red/60 placeholder:text-stadium-muted/50 transition-colors"
          )}
          placeholder="Tell us about yourself…"
        />
      </div>

      {error && (
        <p className="text-red-400 font-inter text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green-400 font-inter text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          Profile updated!
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-lfc-red hover:bg-lfc-red-dark text-white font-inter font-semibold self-start"
      >
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
