import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/constants";
import { setSiteSetting } from "@/lib/gallery/queries";

/** POST /api/gallery/homepage — set homepage hero background (admin only) */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { galleryImageId, cloudinaryUrl } = body;

    // Allow resetting to default by passing null/empty
    if (!galleryImageId && !cloudinaryUrl) {
      await setSiteSetting("homepage_hero_image", null);
      return NextResponse.json({ success: true, reset: true });
    }

    // Direct URL mode (from preset selector)
    if (cloudinaryUrl && !galleryImageId) {
      await setSiteSetting("homepage_hero_image", {
        gallery_image_id: null,
        cloudinary_url: cloudinaryUrl,
      });
      return NextResponse.json({ success: true });
    }

    // Gallery image ID mode (from gallery admin)
    const { data: image, error } = await supabase
      .from("gallery_images")
      .select("id, cloudinary_url, is_homepage_eligible")
      .eq("id", galleryImageId)
      .single();

    if (error || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await setSiteSetting("homepage_hero_image", {
      gallery_image_id: image.id,
      cloudinary_url: image.cloudinary_url,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery/homepage] error:", error);
    return NextResponse.json(
      { error: "Failed to update homepage image" },
      { status: 500 },
    );
  }
}
