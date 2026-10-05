"use client";

// Last-resort boundary: replaces the root layout, so no providers, no
// next-intl and no site chrome are available. Copy is inlined (vi/en).
import "./globals.css";

const COPY = {
  vi: { title: "Có lỗi xảy ra", body: "Trang gặp sự cố ngoài ý muốn. Bạn thử tải lại nhé.", retry: "Thử lại", home: "Về trang chủ" },
  en: { title: "Something went wrong", body: "The page hit an unexpected problem. Please try again.", retry: "Try again", home: "Back to home" },
} as const;

function pickLocale(): keyof typeof COPY {
  if (typeof document === "undefined") return "vi";
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(\w+)/);
  return m?.[1] === "en" ? "en" : "vi";
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = pickLocale();
  const c = COPY[locale];

  return (
    <html lang={locale}>
      <body className="antialiased bg-stadium-bg text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
        <main className="min-h-dvh flex items-center justify-center px-4">
          <div role="alert" className="surface max-w-md w-full px-6 py-8 text-center">
            <h1 className="text-3xl font-bold mb-3">{c.title}</h1>
            <p className="text-stadium-muted mb-6">{c.body}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={reset}
                className="min-h-11 px-6 bg-lfc-red text-white font-bold uppercase tracking-widest text-sm hover:bg-lfc-red-dark cursor-pointer"
              >
                {c.retry}
              </button>
              {/* Plain anchor on purpose: a full load resets whatever broke the app shell. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="min-h-11 px-6 inline-flex items-center justify-center border border-[var(--line-strong)] text-white font-bold uppercase tracking-widest text-sm hover:bg-white/5"
              >
                {c.home}
              </a>
            </div>
            {error.digest && <p className="mt-5 text-xs text-stadium-muted">#{error.digest}</p>}
          </div>
        </main>
      </body>
    </html>
  );
}
