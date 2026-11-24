"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getSiteUrl } from "@/lib/seo";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SUPABASE_AUTH_TIMEOUT_MS } from "@/lib/supabase-fetch-with-timeout";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { toAuthErrorCode, type AuthErrorCode } from "@/lib/auth-error-code";

// Errors are codes, translated by the form (Auth.errors.*), never raw
// provider messages.
export type AuthFormError = AuthErrorCode | "emailRequired" | "passwordRequired" | "passwordShort";
type AuthFormResult = { error?: AuthFormError; success?: "checkEmail" } | undefined;

export async function loginWithEmail(formData: FormData): Promise<AuthFormResult> {
  if (!(formData instanceof FormData)) return { error: "unknown" };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirect(String(formData.get("redirectTo") ?? "/"));

  if (!email) return { error: "emailRequired" };
  if (!password) return { error: "passwordRequired" };

  try {
    const supabase = await createServerSupabaseClient({ timeoutMs: SUPABASE_AUTH_TIMEOUT_MS });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: toAuthErrorCode(error) };
  } catch (err) {
    console.error("[auth] loginWithEmail threw:", err);
    return { error: "unavailable" };
  }

  revalidateLocalizedPath("/");
  redirect(redirectTo);
}

export async function registerWithEmail(formData: FormData): Promise<AuthFormResult> {
  if (!(formData instanceof FormData)) return { error: "unknown" };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "emailRequired" };
  if (password.length < 6) return { error: "passwordShort" };

  try {
    const supabase = await createServerSupabaseClient({ timeoutMs: SUPABASE_AUTH_TIMEOUT_MS });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    if (error) return { error: toAuthErrorCode(error) };

    if (data.user) {
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { error: "userExists" };
      }

      // Always create profile row (even for unconfirmed users). Insert-only, so a
      // repeat signup can never blank out a profile the user already filled in.
      await supabase.from("user_profiles").upsert(
        { user_id: data.user.id, username: null, avatar_url: null, bio: null },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

      // If email not yet confirmed, tell user to check email
      if (!data.user.email_confirmed_at) {
        return { success: "checkEmail" };
      }
    }
  } catch (err) {
    console.error("[auth] registerWithEmail threw:", err);
    return { error: "unavailable" };
  }

  revalidateLocalizedPath("/");
  redirect("/profile");
}

export async function logout() {
  try {
    const supabase = await createServerSupabaseClient({ timeoutMs: SUPABASE_AUTH_TIMEOUT_MS });
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] logout signOut failed:", err);
  }
  revalidatePath("/", "layout");
  redirect("/");
}
