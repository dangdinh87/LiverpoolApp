// Temporary homepage placeholder — replaced in Phase 03 with Hero + Bento layout
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-16">
      <div className="text-center px-4">
        <h1 className="font-bebas text-8xl md:text-[10rem] text-white tracking-wider mb-4 leading-none">
          Liverpool FC
        </h1>
        <p className="font-barlow text-lfc-red text-2xl uppercase tracking-widest mb-6">
          You&apos;ll Never Walk Alone
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/squad"
            className="px-6 py-3 bg-lfc-red text-white font-inter font-medium rounded-lg hover:bg-lfc-red-dark transition-colors"
          >
            View Squad
          </a>
          <a
            href="/fixtures"
            className="px-6 py-3 border border-stadium-border text-stadium-muted font-inter font-medium rounded-lg hover:border-white hover:text-white transition-colors"
          >
            Fixtures
          </a>
        </div>
      </div>
    </div>
  );
}
