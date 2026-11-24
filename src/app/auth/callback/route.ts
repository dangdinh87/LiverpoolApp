import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SUPABASE_AUTH_TIMEOUT_MS } from "@/lib/supabase-fetch-with-timeout";
import { getSafeRedirect } from "@/lib/safe-redirect";

const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (ALLOWED_OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = getSafeRedirect(searchParams.get("redirectTo"));

  const supabase = await createServerSupabaseClient({ timeoutMs: SUPABASE_AUTH_TIMEOUT_MS });
  let verifiedUser: { id: string; user_metadata?: Record<string, unknown> } | null = null;
  let authError: { code?: string; message?: string } | null = null;

  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
    verifiedUser = data.user;
  } else if (tokenHash && isEmailOtpType(type)) {
    const { error, data } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authError = error;
    verifiedUser = data.user;
  }

  if ((code || (tokenHash && isEmailOtpType(type))) && !authError) {
    // Ensure profile exists for OAuth / verified email users. Insert-only: a plain
    // upsert ran on every sign-in and reset username/avatar to the provider's values.
    if (verifiedUser) {
      try {
        await supabase.from("user_profiles").upsert(
          {
            user_id: verifiedUser.id,
            username: typeof verifiedUser.user_metadata?.full_name === "string"
              ? verifiedUser.user_metadata.full_name
              : null,
            avatar_url: typeof verifiedUser.user_metadata?.avatar_url === "string"
              ? verifiedUser.user_metadata.avatar_url
              : null,
            bio: null,
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
      } catch {
        // Non-fatal: profile row can be created later without breaking sign-in.
      }
    }
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  if (authError) {
    console.error("[auth/callback] failed:", authError.code, authError.message);
  }
  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
