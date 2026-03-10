"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_USERNAME_LENGTH = 30;
const MAX_BIO_LENGTH = 200;

export async function updateProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

  // Server-side validation
  if (username && username.length > MAX_USERNAME_LENGTH) {
    return { error: `Username must be ${MAX_USERNAME_LENGTH} characters or less` };
  }
  if (bio && bio.length > MAX_BIO_LENGTH) {
    return { error: `Bio must be ${MAX_BIO_LENGTH} characters or less` };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_profiles")
    .update({ username, bio })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

/**
 * Update avatar URL after client-side upload to Supabase Storage.
 * File is uploaded directly from the browser — no 1MB body limit issue.
 */
export async function updateAvatarUrl(publicUrl: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", user.id);

  if (error) return { error: "Failed to update avatar" };

  revalidatePath("/profile");
  return { success: true };
}

export async function toggleFavouritePlayer(
  playerId: number,
  playerName: string,
  playerPhoto: string
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if already favourited
  const { data: existing } = await supabase
    .from("favourite_players")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("favourite_players")
      .delete()
      .eq("user_id", user.id)
      .eq("player_id", playerId);

    if (error) return { error: "Failed to remove favourite" };

    revalidatePath("/profile");
    revalidatePath(`/player/${playerId}`);
    return { favourited: false };
  } else {
    const { error } = await supabase.from("favourite_players").insert({
      user_id: user.id,
      player_id: playerId,
      player_name: playerName,
      player_photo: playerPhoto,
    });

    if (error) return { error: "Failed to add favourite" };

    revalidatePath("/profile");
    revalidatePath(`/player/${playerId}`);
    return { favourited: true };
  }
}
