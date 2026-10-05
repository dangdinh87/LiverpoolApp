import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSafeRedirect } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = getSafeRedirect(searchParams.get("redirectTo"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure profile exists for OAuth users. Insert-only: a plain upsert ran on
      // every sign-in and reset username/avatar to the provider's values and bio
      // to null, wiping whatever the user had edited on /profile.
      if (data.user) {
        await supabase.from("user_profiles").upsert(
          {
            user_id: data.user.id,
            username: data.user.user_metadata?.full_name ?? null,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
            bio: null,
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
