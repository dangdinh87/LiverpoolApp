import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Coffee,
  Heart,
  Users,
  Calendar,
  Newspaper,
  Trophy,
  UserCircle,
  Mail,
  Github,
  Phone,
  Zap,
  Globe,
  Bot,
  Shield,
} from "lucide-react";
import { MomoModal } from "./momo-modal";
import { makePageMeta, buildBreadcrumbJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { path: "/about" }) };
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  squad: <Users size={18} className="text-lfc-red" />,
  season: <Calendar size={18} className="text-lfc-red" />,
  fixtures: <Zap size={18} className="text-lfc-red" />,
  news: <Newspaper size={18} className="text-lfc-red" />,
  history: <Trophy size={18} className="text-lfc-red" />,
  profile: <UserCircle size={18} className="text-lfc-red" />,
  ai: <Bot size={18} className="text-lfc-red" />,
  i18n: <Globe size={18} className="text-lfc-red" />,
};

const FEATURE_KEYS = [
  "squad",
  "season",
  "fixtures",
  "news",
  "history",
  "profile",
  "ai",
  "i18n",
] as const;

export default async function AboutPage() {
  const t = await getTranslations("About");

  return (
    <main className="min-h-screen bg-stadium-bg text-white pt-24 pb-32">
      <JsonLd data={buildBreadcrumbJsonLd([
        { name: "Home", url: getCanonical("/") },
        { name: "About", url: getCanonical("/about") },
      ])} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* ── Header ── */}
        <div>
          <p className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-xs font-bold mb-2">
            {t("label")}
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-4">
            {t("title")}
          </h1>
          <p className="font-inter text-stadium-muted text-base leading-relaxed max-w-2xl">
            {t("whatIs.description")}
          </p>
        </div>

        {/* ── Disclaimer ── */}
        <div className="flex items-start gap-4 bg-lfc-red/5 border border-lfc-red/10 p-6">
          <Heart size={20} className="text-lfc-red shrink-0 mt-0.5" />
          <p className="font-inter text-stadium-muted text-sm leading-relaxed">
            {t.rich("disclaimer", {
              status: (chunks) => (
                <strong className="text-white">{chunks}</strong>
              ),
            })}
          </p>
        </div>

        {/* ── Features grid ── */}
        <section className="space-y-6">
          <div>
            <h2 className="font-bebas text-3xl text-white tracking-wider">
              {t("whatIs.title")}
            </h2>
            <p className="font-barlow text-lfc-red uppercase tracking-[0.2em] text-xs font-bold mt-1">
              {t("whatIs.featuresTitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-start gap-3 bg-stadium-surface/50 border border-stadium-border/50 p-4 hover:border-lfc-red/30 transition-colors"
              >
                <span className="shrink-0 mt-0.5">{FEATURE_ICONS[key]}</span>
                <p className="font-inter text-stadium-muted text-sm leading-relaxed">
                  {t(`whatIs.features.${key}`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Creator ── */}
        <section className="space-y-6">
          <h2 className="font-bebas text-3xl text-white tracking-wider">
            {t("creator.title")}
          </h2>
          <div className="flex flex-col sm:flex-row items-start gap-6 bg-stadium-surface/50 border border-stadium-border/50 p-6">
            <div className="w-16 h-16 rounded-full bg-lfc-red/20 border border-lfc-red/30 flex items-center justify-center shrink-0">
              <Shield size={28} className="text-lfc-red" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bebas text-xl text-white tracking-wider">
                Nguyễn Đăng Định
              </h3>
              <p className="font-barlow text-lfc-red uppercase tracking-[0.15em] text-xs font-bold">
                {t("creator.role")}
              </p>
              <p className="font-inter text-stadium-muted text-sm leading-relaxed">
                {t("creator.bio")}
              </p>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="space-y-4">
          <h2 className="font-bebas text-3xl text-white tracking-wider">
            {t("contact.title")}
          </h2>
          <p className="font-inter text-stadium-muted text-sm leading-relaxed">
            {t("contact.description")}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:nguyendangdinh47@gmail.com"
              className="inline-flex items-center gap-2 px-5 py-3 bg-stadium-surface border border-stadium-border text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:border-lfc-red/50 transition-colors"
            >
              <Mail size={16} />
              {t("contact.email")}
            </a>
            <a
              href={t("contact.githubUrl")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-stadium-surface border border-stadium-border text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:border-lfc-red/50 transition-colors"
            >
              <Github size={16} />
              {t("contact.github")}
            </a>
            <a
              href="tel:0977963775"
              className="inline-flex items-center gap-2 px-5 py-3 bg-stadium-surface border border-stadium-border text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:border-lfc-red/50 transition-colors"
            >
              <Phone size={16} />
              {t("contact.phone")}
            </a>
          </div>
        </section>

        {/* ── Support ── */}
        <section className="border-t border-stadium-border pt-12 text-center space-y-6">
          <Coffee size={32} className="text-lfc-gold mx-auto" />
          <h2 className="font-bebas text-3xl text-white tracking-wider">
            {t("support.title")}
          </h2>
          <p className="font-inter text-stadium-muted text-sm max-w-md mx-auto">
            {t("support.description")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://buymeacoffee.com/deannguyen872k"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-lfc-gold text-stadium-bg font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:bg-lfc-gold/90 transition-colors"
            >
              <Coffee size={16} />
              {t("support.buyCoffee")}
            </a>
            <MomoModal />
          </div>
        </section>
      </div>
    </main>
  );
}
