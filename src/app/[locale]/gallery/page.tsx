import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { makePageMeta, buildBreadcrumbJsonLd, buildImageGalleryJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { GalleryPage as GalleryClient } from "@/components/gallery/gallery-page";
import { unstable_cache } from "next/cache";
import {
  listGalleryImagesFromDB,
  getGalleryCategoryCounts,
  GALLERY_CACHE_TAG,
} from "@/lib/gallery/queries";
import { isAdminEmail } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import galleryFallback from "@/data/gallery.json";
import { PageHero } from "@/components/ui/page-hero";

/**
 * Images rendered on the first page.
 *
 * The fallback path used to render all 354 entries of gallery.json while the
 * database path asked for 50, so whenever the database was unreachable this
 * route emitted ~1 MB of HTML per cold render — slow enough on its own to
 * overrun a serverless function's budget. Both paths now use one page size.
 */
const GALLERY_PAGE_SIZE = 50;

/**
 * First page + category counts, cached across requests (the route itself is
 * dynamic, so its `revalidate` export alone never cached anything). Failures
 * throw and are therefore not cached; the page falls back to gallery.json.
 * Admin uploads/deletes revalidate the tag.
 */
const getCachedGalleryFirstPage = unstable_cache(
  async () =>
    Promise.all([
      listGalleryImagesFromDB({ limit: GALLERY_PAGE_SIZE, offset: 0 }),
      getGalleryCategoryCounts(),
    ]),
  ["gallery-first-page-v1"],
  { revalidate: 1800, tags: [GALLERY_CACHE_TAG] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/gallery" }) };
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

/**
 * Whether the viewer may edit the gallery.
 *
 * Guarded and defaulting to false: this only decides whether edit affordances
 * render, so an unreachable auth service must not slow or fail the page. It ran
 * unguarded and sequentially after the image query, making a database outage
 * cost two full request timeouts back to back.
 */
async function resolveIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return isAdminEmail(user?.email);
  } catch {
    return false;
  }
}

export default async function GalleryRoute({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  let images: ClientGalleryImage[];
  let totalImages = 0;
  let categoryCounts: Record<string, number> = {};

  // Started before the image query and awaited after, so the two overlap. Run
  // one after the other, a database outage cost two request timeouts in series.
  const isAdminPromise = resolveIsAdmin();

  try {
    const [{ images: dbImages, total }, counts] = await getCachedGalleryFirstPage();
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
      images = galleryFallback.slice(0, GALLERY_PAGE_SIZE);
      totalImages = galleryFallback.length;
    }
  } catch {
    images = galleryFallback.slice(0, GALLERY_PAGE_SIZE);
    totalImages = galleryFallback.length;
  }

  const isAdmin = await isAdminPromise;
  const t = await getTranslations("Gallery.hero");

  return (
    <div className="bg-stadium-bg text-white">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "Gallery", url: getCanonical("/gallery") },
        ]),
        buildImageGalleryJsonLd(
          images.slice(0, 20).map((img) => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height,
          }))
        ),
      ]} />
      <PageHero eyebrow={t("label")} title={t("title")} description={t("subtitle")} />
      <div className="page-container pt-6 pb-16 sm:pt-8">
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
