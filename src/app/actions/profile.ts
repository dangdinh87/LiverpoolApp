"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function updateProfile(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;

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

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar") as File | null;
  if (!file) return { error: "No file provided" };

  // Validate type + size (max 2MB)
  if (!file.type.startsWith("image/")) return { error: "Only image files allowed" };
  if (file.size > 2 * 1024 * 1024) return { error: "File must be under 2MB" };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ avatar_url: publicUrl })
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  return { success: true, url: publicUrl };
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
    // Remove favourite
    await supabase
      .from("favourite_players")
      .delete()
      .eq("user_id", user.id)
      .eq("player_id", playerId);

    revalidatePath("/profile");
    revalidatePath(`/player/${playerId}`);
    return { favourited: false };
  } else {
    // Add favourite
    await supabase.from("favourite_players").insert({
      user_id: user.id,
      player_id: playerId,
      player_name: playerName,
      player_photo: playerPhoto,
    });

    revalidatePath("/profile");
    revalidatePath(`/player/${playerId}`);
    return { favourited: true };
  }
}
