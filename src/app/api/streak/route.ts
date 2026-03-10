import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * GET /api/streak — Record visit & return current streak.
 * Streak logic:
 *   - Same day → no change
 *   - Consecutive day (yesterday) → streak + 1
 *   - Gap > 1 day → reset to 1
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ streak: 0 }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("streak_count, last_visit_date")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ streak: 0 });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastVisit = profile.last_visit_date;

    // Already visited today
    if (lastVisit === today) {
      return NextResponse.json({ streak: profile.streak_count ?? 1 });
    }

    let newStreak = 1;

    if (lastVisit) {
      const lastDate = new Date(lastVisit + "T00:00:00Z");
      const todayDate = new Date(today + "T00:00:00Z");
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // Consecutive day
        newStreak = (profile.streak_count ?? 0) + 1;
      }
      // diffDays > 1 → reset to 1 (already default)
    }

    await supabase
      .from("user_profiles")
      .update({ streak_count: newStreak, last_visit_date: today })
      .eq("user_id", user.id);

    return NextResponse.json({ streak: newStreak });
  } catch {
    return NextResponse.json({ streak: 0 }, { status: 500 });
  }
}
