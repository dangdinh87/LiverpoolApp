import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { PageHero } from "@/components/ui/page-hero";
import { makePageMeta } from "@/lib/seo";
import { toParagraphs } from "./paragraphs";

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.metadata" });
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...makePageMeta(title, description, { path: "/legal" }),
  };
}

// Bump when the policy text in messages/*.json (Legal.*) changes.
const LEGAL_LAST_UPDATED = new Date("2026-10-04T00:00:00+07:00");

const SECTION_KEYS = ["privacy", "terms", "sources"] as const;

export default async function LegalPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Legal");
  const lastUpdated = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(LEGAL_LAST_UPDATED);

  return (
    <div className="bg-stadium-bg text-white">
      <PageHero title={t("title")} description={t("lastUpdated", { date: lastUpdated })} />

      <div className="page-container pb-20 pt-6 sm:pt-10">
        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
          {/* Table of contents: chip row on phones, sticky list on desktop */}
          <nav aria-label={t("toc")} className="mb-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:mb-0 lg:self-start">
            <p className="section-label mb-2 hidden text-brand lg:block">{t("toc")}</p>
            <ul className="scroll-x -mx-4 flex gap-2 px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:px-0">
              {SECTION_KEYS.map((key) => (
                <li key={key} className="shrink-0">
                  <a
                    href={`#${key}`}
                    className="inline-flex min-h-11 items-center border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white lg:w-full lg:border-0 lg:border-l-2 lg:border-transparent lg:px-3 lg:hover:border-lfc-red"
                  >
                    {t(`sections.${key}.title`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="min-w-0 max-w-[65ch]">
            <div className="space-y-12">
              {SECTION_KEYS.map((key) => (
                <section key={key} id={key} className="scroll-mt-[calc(var(--header-h)+1rem)]">
                  <h2 className="font-bebas text-3xl text-white sm:text-4xl">{t(`sections.${key}.title`)}</h2>
                  <div className="mt-4 space-y-4 text-base leading-[1.75] text-stadium-muted">
                    {toParagraphs(t(`sections.${key}.content`)).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-14 border-t border-[var(--line)] pt-6">
              <p className="text-sm text-stadium-muted">
                {t.rich("contact", {
                  email: (chunks) => (
                    <a href={`mailto:${chunks}`} className="font-semibold text-brand underline-offset-4 hover:underline">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
