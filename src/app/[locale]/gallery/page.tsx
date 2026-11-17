import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { makePageMeta, buildImageGalleryJsonLd } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { GalleryPage as GalleryClient } from "@/components/gallery/gallery-page";
import { unstable_cache } from "next/cache";
import {
  listGalleryImagesFromDB,
  getGalleryCategoryCounts,
  GALLERY_CACHE_TAG,
} from "@/lib/gallery/queries";
import galleryFallback from "@/data/gallery.json";
import { PageHero } from "@/components/ui/page-hero";

const GALLERY_PAGE_SIZE = 50;

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
  return { title, description, ...makePageMeta(title, description, { locale, path: "/gallery" }) };
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

export default async function GalleryRoute({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  let images: ClientGalleryImage[];
  let totalImages = 0;
  let categoryCounts: Record<string, number> = {};

  const [galleryResult, t, breadcrumbJsonLd] = await Promise.all([
    getCachedGalleryFirstPage().catch(() => null),
    getTranslations("Gallery.hero"),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "gallery", path: "/gallery" }]),
  ]);

  if (galleryResult && galleryResult[0].images.length > 0) {
    const [{ images: dbImages, total }, counts] = galleryResult;
    totalImages = total;
    categoryCounts = counts;
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

  return (
    <div className="bg-stadium-bg text-white">
      <JsonLd data={[
        breadcrumbJsonLd,
        buildImageGalleryJsonLd(
          images.slice(0, 20).map((img) => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height,
          })),
          locale,
        ),
      ]} />
      <PageHero eyebrow={t("label")} title={t("title")} description={t("subtitle")} />
      <div className="page-container pt-6 pb-16 sm:pt-8">
        <GalleryClient
          images={images}
          totalImages={totalImages}
          categoryCounts={categoryCounts}
        />
      </div>
    </div>
  );
}
