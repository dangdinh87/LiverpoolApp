import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("Legal.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LegalPage() {
  const t = await getTranslations("Legal");

  const sectionKeys = ["privacy", "terms", "sources"] as const;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-bebas text-4xl sm:text-5xl text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-stadium-muted font-inter text-sm mb-10">
          {t("lastUpdated", { date: "March 2026" })}
        </p>

        <div className="space-y-10">
          {sectionKeys.map((key) => (
            <section key={key}>
              <h2 className="font-bebas text-2xl text-white mb-3">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="text-stadium-muted font-inter text-sm leading-relaxed">
                {t(`sections.${key}.content`)}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-stadium-border">
          <p className="text-stadium-muted text-xs font-inter">
            {t.rich("contact", {
              email: (chunks) => (
                <a
                  href={`mailto:${chunks}`}
                  className="text-lfc-red hover:text-lfc-gold transition-colors"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
