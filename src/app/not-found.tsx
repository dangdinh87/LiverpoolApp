import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("Common");

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Crest */}
      <Image
        src="/assets/lfc/crest.webp"
        alt="LFCVN"
        width={64}
        height={80}
        className="opacity-20 mb-8"
      />

      {/* 404 number */}
      <h1 className="font-bebas text-[120px] md:text-[160px] leading-none text-lfc-red/20 tracking-wider select-none">
        404
      </h1>

      {/* Title */}
      <p className="font-bebas text-4xl md:text-5xl text-white tracking-wider -mt-6 mb-3">
        {t("notFoundTitle")}
      </p>

      {/* Description */}
      <p className="font-inter text-stadium-muted text-sm max-w-md mb-8">
        {t("notFoundMessage")}
      </p>

      {/* CTA */}
      <Link
        href="/"
        className="px-6 py-3 bg-lfc-red text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:bg-lfc-red-dark transition-colors"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
