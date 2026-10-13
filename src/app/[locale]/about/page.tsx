import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import {
  Coffee,
  Heart,
  Users,
  Calendar,
  CalendarPlus,
  Newspaper,
  Layers,
  FileText,
  EyeOff,
  Target,
  Mail,
  Github,
  Phone,
} from "lucide-react";
import { MomoModal } from "./momo-modal";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { BRAND } from "@/lib/brand";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/about" }) };
}

// The news product first (gathered, de-duplicated, summed up), then what sits beside it.
const FEATURES = [
  { key: "gathered", Icon: Newspaper },
  { key: "dedupe", Icon: Layers },
  { key: "digest", Icon: FileText },
  { key: "fixtures", Icon: Calendar },
  { key: "spoiler", Icon: EyeOff },
  { key: "calendar", Icon: CalendarPlus },
  { key: "predictions", Icon: Target },
  { key: "club", Icon: Users },
] as const;

const BUTTON =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 font-barlow text-sm font-bold uppercase tracking-[0.12em] transition-colors";
const BUTTON_OUTLINE = `${BUTTON} border border-[var(--line-strong)] text-white hover:border-white/40`;

export const revalidate = 86400;

export default async function AboutPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const tLegal = await getTranslations("Legal");

  return (
    <div className="bg-stadium-bg text-white">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "About", url: getCanonical("/about") },
        ])}
      />
      <PageHero eyebrow={t("label")} title={t("title")} description={t("tagline")} />

      <div className="page-container pb-20 pt-8 sm:pt-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-12 sm:space-y-16">
            {/* Story + disclaimer */}
            <section className="space-y-6">
              <SectionHeader className="mb-0 sm:mb-0" eyebrow={t("eyebrow.story")} title={t("whatIs.title", { brand: BRAND.name })} />
              <p className="max-w-[65ch] text-base leading-[1.7] text-white/85 sm:text-[17px]">{t("whatIs.description")}</p>
              <div className="surface flex items-start gap-4 border-l-2 border-l-lfc-red p-4 sm:p-5">
                <Heart size={24} aria-hidden className="mt-0.5 shrink-0 text-lfc-red" />
                <p className="text-[15px] leading-relaxed text-stadium-muted">
                  {t.rich("disclaimer", { brand: BRAND.name, status: (chunks) => <strong className="text-white">{chunks}</strong> })}
                </p>
              </div>
            </section>

            {/* Features */}
            <section>
              <SectionHeader eyebrow={t("eyebrow.features")} title={t("whatIs.featuresTitle")} />
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FEATURES.map(({ key, Icon }) => (
                  <li key={key} className="surface p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Icon size={22} aria-hidden className="shrink-0 text-lfc-red" />
                      <h3 className="font-barlow text-base font-bold uppercase tracking-[0.1em] text-white">{t(`whatIs.features.${key}.title`)}</h3>
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-stadium-muted">{t(`whatIs.features.${key}.body`)}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* News handling, AI, data sources: the honest-disclosure block */}
            <section>
              <SectionHeader eyebrow={t("eyebrow.news")} title={t("news.title")} />
              <p className="max-w-[65ch] text-base leading-[1.7] text-stadium-muted">{t("news.body", { brand: BRAND.name })}</p>
            </section>
            <section>
              <SectionHeader eyebrow={t("eyebrow.ai")} title={t("ai.title", { brand: BRAND.name })} />
              <p className="max-w-[65ch] text-base leading-[1.7] text-stadium-muted">{t("ai.body")}</p>
            </section>
            <section>
              <SectionHeader eyebrow={t("eyebrow.data")} title={t("whatIs.dataTitle")} />
              <p className="max-w-[65ch] text-base leading-[1.7] text-stadium-muted">{t("whatIs.dataSources")}</p>
              <Link href="/legal#sources" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline">
                {tLegal("sections.sources.title")} →
              </Link>
            </section>
          </div>

          {/* Contact + support: sticky beside the text on wide screens, last on phones */}
          <aside className="mt-12 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mt-0 lg:self-start">
            <div className="surface border-t-2 border-t-lfc-red p-5 sm:p-6">
              <section>
                <SectionHeader className="mb-2 sm:mb-2" eyebrow={t("creator.title")} title={t("contact.title")} />
                <p className="text-sm text-stadium-muted">{t("creator.role")}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-stadium-muted">{t("creator.bio")}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-stadium-muted">{t("contact.description")}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <a href="mailto:nguyendangdinh47@gmail.com" className={`${BUTTON} bg-lfc-red text-white hover:bg-lfc-red-dark`}>
                    <Mail size={16} aria-hidden />
                    {t("contact.email")}
                  </a>
                  <a href={t("contact.githubUrl")} target="_blank" rel="noopener noreferrer" className={BUTTON_OUTLINE}>
                    <Github size={16} aria-hidden />
                    {t("contact.github")}
                  </a>
                  <a href="tel:0977963775" className={BUTTON_OUTLINE}>
                    <Phone size={16} aria-hidden />
                    {t("contact.phone")}
                  </a>
                </div>
              </section>

              <section className="mt-8 border-t border-[var(--line)] pt-8">
                <SectionHeader className="mb-2 sm:mb-2" eyebrow={t("eyebrow.support")} title={t("support.title")} />
                <p className="text-[15px] leading-relaxed text-stadium-muted">{t("support.description", { brand: BRAND.name })}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <a
                    href="https://buymeacoffee.com/deannguyen872k"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BUTTON} bg-lfc-gold text-stadium-bg hover:bg-lfc-gold/90`}
                  >
                    <Coffee size={16} aria-hidden />
                    {t("support.buyCoffee")}
                  </a>
                  <MomoModal />
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
