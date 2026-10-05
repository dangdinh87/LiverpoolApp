import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { Coffee, Heart, Users, Calendar, Newspaper, Trophy, UserCircle, Mail, Github, Phone, Zap, Globe, Bot } from "lucide-react";
import { MomoModal } from "./momo-modal";
import { PageHero } from "@/components/ui/page-hero";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/about" }) };
}

const FEATURES = [
  { key: "squad", Icon: Users },
  { key: "season", Icon: Calendar },
  { key: "fixtures", Icon: Zap },
  { key: "news", Icon: Newspaper },
  { key: "history", Icon: Trophy },
  { key: "profile", Icon: UserCircle },
  { key: "ai", Icon: Bot },
  { key: "i18n", Icon: Globe },
] as const;

const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 px-5 font-barlow text-sm font-bold uppercase tracking-[0.12em] transition-colors";

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
        <div className="max-w-3xl space-y-12 sm:space-y-16">
          {/* Story + disclaimer */}
          <section aria-labelledby="about-story" className="space-y-6">
            <h2 id="about-story" className="font-bebas text-3xl text-white sm:text-4xl">
              {t("whatIs.title")}
            </h2>
            <p className="max-w-[65ch] text-base leading-[1.75] text-stadium-muted">{t("whatIs.description")}</p>
            <div className="surface flex items-start gap-4 border-l-2 border-l-lfc-red p-4 sm:p-5">
              <Heart size={24} aria-hidden className="mt-0.5 shrink-0 text-lfc-red" />
              <p className="text-sm leading-relaxed text-stadium-muted">
                {t.rich("disclaimer", { status: (chunks) => <strong className="text-white">{chunks}</strong> })}
              </p>
            </div>
          </section>

          {/* Features */}
          <section aria-labelledby="about-features">
            <p className="section-label mb-1 text-brand">{t("whatIs.featuresTitle")}</p>
            <h2 id="about-features" className="sr-only">
              {t("whatIs.featuresTitle")}
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map(({ key, Icon }) => (
                <li key={key} className="surface flex items-start gap-3 p-4">
                  <Icon size={24} aria-hidden className="mt-0.5 shrink-0 text-lfc-red" />
                  <p className="text-sm leading-relaxed text-stadium-muted">{t(`whatIs.features.${key}`)}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Data + tech */}
          <section aria-labelledby="about-data" className="space-y-6">
            <h2 id="about-data" className="sr-only">
              {t("whatIs.dataTitle")}
            </h2>
            <div>
              <h3 className="font-bebas text-2xl text-white">{t("whatIs.dataTitle")}</h3>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-stadium-muted">{t("whatIs.dataSources")}</p>
              <Link href="/legal#sources" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-4 hover:underline">
                {tLegal("sections.sources.title")} →
              </Link>
            </div>
            <div>
              <h3 className="font-bebas text-2xl text-white">{t("whatIs.techTitle")}</h3>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-stadium-muted">{t("whatIs.techStack")}</p>
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="about-contact" className="surface border-t-2 border-t-lfc-red p-5 sm:p-8">
            <h2 id="about-contact" className="font-bebas text-3xl text-white sm:text-4xl">
              {t("contact.title")}
            </h2>
            <p className="mt-1 text-sm text-stadium-muted">
              <span className="font-semibold text-white">{t("creator.title")}</span> · {t("creator.role")}
            </p>
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-stadium-muted">{t("creator.bio")}</p>
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-stadium-muted">{t("contact.description")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="mailto:nguyendangdinh47@gmail.com" className={`${BUTTON} bg-lfc-red text-white hover:bg-lfc-red-dark`}>
                <Mail size={16} aria-hidden />
                {t("contact.email")}
              </a>
              <a
                href={t("contact.githubUrl")}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BUTTON} border border-[var(--line-strong)] text-white hover:border-white/40`}
              >
                <Github size={16} aria-hidden />
                {t("contact.github")}
              </a>
              <a href="tel:0977963775" className={`${BUTTON} border border-[var(--line-strong)] text-white hover:border-white/40`}>
                <Phone size={16} aria-hidden />
                {t("contact.phone")}
              </a>
            </div>
          </section>

          {/* Support */}
          <section aria-labelledby="about-support" className="flex flex-col items-start gap-4 border-t border-[var(--line)] pt-10">
            <Coffee size={32} aria-hidden className="text-lfc-gold" />
            <h2 id="about-support" className="font-bebas text-3xl text-white">
              {t("support.title")}
            </h2>
            <p className="max-w-[65ch] text-sm text-stadium-muted">{t("support.description")}</p>
            <div className="flex flex-wrap gap-3">
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
      </div>
    </div>
  );
}
