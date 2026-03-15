import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail, GALLERY_CATEGORIES } from "@/lib/constants";
import { uploadGalleryImage, deleteGalleryImage } from "@/lib/cloudinary";
import {
  listGalleryImagesFromDB,
  insertGalleryImage,
  deleteGalleryImageFromDB,
  getGalleryImageById,
} from "@/lib/gallery/queries";

/** GET /api/gallery?offset=0&limit=50&category=all — paginated gallery images */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    const { images, total } = await listGalleryImagesFromDB({
      limit: Math.min(limit, 100),
      offset,
      category,
      search,
    });

    return NextResponse.json({
      images: images.map((img) => ({
        id: img.id,
        src: img.cloudinary_url,
        alt: img.alt,
        category: img.category,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        cloudinaryId: img.cloudinary_public_id,
        isHomepageEligible: img.is_homepage_eligible,
      })),
      total,
      hasMore: offset + images.length < total,
    });
  } catch (error) {
    console.error("[gallery] list error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 },
    );
  }
}

/** POST /api/gallery — upload image (admin only) */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const alt = (formData.get("alt") as string) || "";
    const category = (formData.get("category") as string) || "anfield";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (
      !GALLERY_CATEGORIES.includes(
        category as (typeof GALLERY_CATEGORIES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudinaryResult = await uploadGalleryImage(buffer, { category, alt });

    // Persist to Supabase
    const dbRow = await insertGalleryImage({
      cloudinary_public_id: cloudinaryResult.id,
      cloudinary_url: cloudinaryResult.src,
      alt,
      category: category as (typeof GALLERY_CATEGORIES)[number],
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
    });

    return NextResponse.json({
      image: {
        id: dbRow.id,
        src: dbRow.cloudinary_url,
        alt: dbRow.alt,
        category: dbRow.category,
        cloudinaryId: dbRow.cloudinary_public_id,
      },
    });
  } catch (error) {
    console.error("[gallery] upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}

/** DELETE /api/gallery — delete image (admin only) */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    // Look up the image to get Cloudinary public_id
    const image = await getGalleryImageById(id);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from Supabase first, then Cloudinary
    await deleteGalleryImageFromDB(id);
    await deleteGalleryImage(image.cloudinary_public_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[gallery] delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
