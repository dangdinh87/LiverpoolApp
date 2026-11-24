import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";
import { getSquadPlayers } from "@/lib/squad-data";
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
import { PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";

const GALLERY_PAGE_SIZE = 50;

const getCachedGalleryFirstPage = unstable_cache(
  async () => {
    const res = await Promise.all([
      listGalleryImagesFromDB({ limit: GALLERY_PAGE_SIZE, offset: 0 }),
      getGalleryCategoryCounts(),
    ]);
    if (res[0].images.length === 0) {
      throw new Error("[gallery] empty DB response — not caching");
    }
    return res;
  },
  ["gallery-first-page-v1"],
  { revalidate: 21600, tags: [GALLERY_CACHE_TAG] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/gallery" }) };
}

export const revalidate = 21600;

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

  const [galleryResult, t, tHub, breadcrumbJsonLd] = await Promise.all([
    getCachedGalleryFirstPage().catch(() => null),
    getTranslations("Gallery.hero"),
    getTranslations("Hub"),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "gallery", path: "/gallery" }]),
  ]);

  const squadCount = getSquadPlayers().length;

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

  const heritageLinks = [
    {
      href: "/history",
      title: tHub("cards.history.title"),
      badge: tHub("cards.history.badge"),
      accent: "border-t-lfc-gold",
    },
    {
      href: "/squad",
      title: tHub("cards.squad.title"),
      badge: `${squadCount} · ${tHub("cards.squad.badge")}`,
      accent: "border-t-lfc-red",
    },
    {
      href: "/fixtures",
      title: tHub("cards.fixtures.title"),
      badge: tHub("cards.fixtures.badge"),
      accent: "border-t-lfc-red",
    },
  ] as const;

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
      <PageHero clubCrest eyebrow={t("label")} title={t("title")} description={t("subtitle")} />
      <div className="page-container space-y-8 pt-6 pb-16 sm:pt-8">
        <SectionSubNav group="club" current="gallery" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {heritageLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between gap-3 border border-stadium-border border-t-2 ${item.accent} bg-stadium-surface px-4 py-3 transition-colors hover:border-white/25 hover:bg-stadium-surface2`}
            >
              <div className="min-w-0">
                <p className="font-barlow text-[11px] font-bold uppercase tracking-[0.14em] text-stadium-muted">
                  {item.badge}
                </p>
                <p className="mt-0.5 truncate font-bebas text-xl leading-none tracking-wide text-white group-hover:text-lfc-gold">
                  {item.title}
                </p>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-stadium-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                aria-hidden
              />
            </Link>
          ))}
        </div>

        <GalleryClient
          images={images}
          totalImages={totalImages}
          categoryCounts={categoryCounts}
        />

        <PresetConnectedGrid
          preset="fromGallery"
          metaOverrides={{
            history: "1892",
            squad: `${squadCount}`,
          }}
        />
      </div>
    </div>
  );
}
