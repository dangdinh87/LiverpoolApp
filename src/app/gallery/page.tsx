import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { makePageMeta } from "@/lib/seo";
import { GalleryPage as GalleryClient } from "@/components/gallery/gallery-page";
import { listGalleryImagesFromDB, getGalleryCategoryCounts } from "@/lib/gallery/queries";
import { isAdminEmail } from "@/lib/constants";
import galleryFallback from "@/data/gallery.json";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Gallery.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description) };
}

export const revalidate = 1800;

interface ClientGalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  width?: number;
  height?: number;
  cloudinaryId?: string;
  isHomepageEligible?: boolean;
}

export default async function GalleryRoute() {
  let images: ClientGalleryImage[];
  let totalImages = 0;
  let categoryCounts: Record<string, number> = {};
  try {
    const [{ images: dbImages, total }, counts] = await Promise.all([
      listGalleryImagesFromDB({ limit: 50, offset: 0 }),
      getGalleryCategoryCounts(),
    ]);
    totalImages = total;
    categoryCounts = counts;
    if (dbImages.length > 0) {
      images = dbImages.map((img) => ({
        id: img.id,
        src: img.cloudinary_url,
        alt: img.alt,
        category: img.category,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        cloudinaryId: img.cloudinary_public_id,
        isHomepageEligible: img.is_homepage_eligible,
      }));
    } else {
      images = galleryFallback;
      totalImages = galleryFallback.length;
    }
  } catch {
    images = galleryFallback;
    totalImages = galleryFallback.length;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="min-h-screen bg-stadium-bg text-white pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <GalleryClient
          images={images}
          isAdmin={isAdmin}
          totalImages={totalImages}
          categoryCounts={categoryCounts}
        />
      </div>
    </div>
  );
}
