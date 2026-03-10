"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/** Validate redirect path to prevent open redirect */
function getSafeRedirect(raw: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function loginWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirect(String(formData.get("redirectTo") ?? "/"));

  if (!email) return { error: "Email is required" };
  if (!password) return { error: "Password is required" };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/");
  redirect(redirectTo);
}

export async function registerWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Email is required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  if (data.user) {
    // Always create profile row (even for unconfirmed users)
    await supabase.from("user_profiles").upsert(
      { user_id: data.user.id, username: null, avatar_url: null, bio: null },
      { onConflict: "user_id" }
    );

    // If email not yet confirmed, tell user to check email
    if (!data.user.email_confirmed_at) {
      return { success: "Check your email to confirm your account." };
    }
  }

  revalidatePath("/");
  redirect("/profile");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
