import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } };

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
    if (!user) return NextResponse.json({ streak: 0 }, { status: 401, ...NO_STORE });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("streak_count, last_visit_date")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ streak: 0 }, NO_STORE);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastVisit = profile.last_visit_date;

    // Already visited today
    if (lastVisit === today) {
      return NextResponse.json({ streak: profile.streak_count ?? 1 }, NO_STORE);
    }

    let newStreak = 1;

    if (lastVisit && /^\d{4}-\d{2}-\d{2}$/.test(lastVisit)) {
      const lastDate = new Date(lastVisit + "T00:00:00Z");
      const todayDate = new Date(today + "T00:00:00Z");
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 0) {
        return NextResponse.json({ streak: profile.streak_count ?? 1 }, NO_STORE);
      }
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

    return NextResponse.json({ streak: newStreak }, NO_STORE);
  } catch {
    return NextResponse.json({ streak: 0 }, { status: 500, ...NO_STORE });
  }
}
